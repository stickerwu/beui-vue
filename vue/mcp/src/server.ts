import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { CfWorkerJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/cfworker'
import { z } from 'zod'
import { base, getIndex, getItem, installCommand, PACKAGE_MANAGERS, validSlug, type Env, type IndexItem, type PackageManager } from './registry.js'

const json = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] })
const error = (message: string) => ({ isError: true, content: [{ type: 'text' as const, text: message }] })

const summary = (item: IndexItem) => ({
  slug: item.name,
  name: item.title,
  category: item.categories?.[0] ?? 'motion',
  description: item.description,
  page_url: item.meta?.page,
})

/** Relevance of one item to a query: every word must match somewhere; name and title matches rank first. */
function score(item: IndexItem, query: string) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return 0
  const slug = item.name.toLowerCase()
  const title = item.title.toLowerCase()
  const description = item.description.toLowerCase()
  const category = (item.categories ?? []).join(' ').toLowerCase()
  const whole = words.join(' ')
  if (slug === whole.replace(/\s+/g, '-') || title === whole) return 1000
  let total = 0
  for (const word of words) {
    if (slug.includes(word) || title.includes(word)) total += 60
    else if (description.includes(word)) total += 20
    else if (category.includes(word)) total += 10
    else return 0
  }
  return total
}

export function createServer(env: Env) {
  const server = new McpServer({ name: 'beui-vue', version: '0.1.0' }, { jsonSchemaValidator: new CfWorkerJsonSchemaValidator() })

  server.registerTool('list_components', {
    description: "List beui-vue components (animated Vue 3 components, the Vue port of beUI). Optionally filter by category: 'motion', 'blocks', 'agents', 'charts' or 'casino'.",
    inputSchema: { category: z.string().optional().describe("Category to filter by, e.g. 'motion' or 'blocks'.") },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ category }) => {
    try {
      const { items } = await getIndex(env)
      return json(items.filter(item => !category || item.categories?.includes(category)).map(summary))
    } catch (cause) {
      return error(`Failed to list components: ${(cause as Error).message}`)
    }
  })

  server.registerTool('search_components', {
    description: 'Search beui-vue components by keyword. Matches the install slug, name, description and category; best matches first.',
    inputSchema: { query: z.string().min(1).max(100).describe("Search term, e.g. 'bottom sheet', 'toast', 'command palette'.") },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ query }) => {
    try {
      const { items } = await getIndex(env)
      const ranked = items.map(item => ({ item, value: score(item, query) })).filter(entry => entry.value > 0).sort((a, b) => b.value - a.value)
      return json(ranked.slice(0, 25).map(entry => summary(entry.item)))
    } catch (cause) {
      return error(`Search failed: ${(cause as Error).message}`)
    }
  })

  server.registerTool('get_component', {
    description: 'Get a beui-vue component by install slug: description, npm dependencies, every source file (path, target and contents), the usage note and the install command. Use it to copy the component into a Vue project.',
    inputSchema: { slug: z.string().describe("Install slug, e.g. 'button-base' (from list_components or search_components).") },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ slug }) => {
    try {
      const item = await getItem(env, slug)
      return json({
        slug: item.name,
        name: item.title,
        description: item.description,
        category: item.categories?.[0] ?? 'motion',
        page_url: item.meta?.page,
        registry_url: `${base(env)}/r/${item.name}.json`,
        dependencies: item.dependencies ?? [],
        install: installCommand(item.name, 'npm'),
        usage: item.docs,
        files: item.files.map(file => ({ path: file.path, target: file.target ?? file.path, content: file.content })),
      })
    } catch (cause) {
      return error(`Could not load component "${slug}": ${(cause as Error).message}`)
    }
  })

  server.registerTool('get_install_command', {
    description: 'Get the shadcn-vue CLI command that installs a beui-vue component, for a package manager. The project needs a components.json (run `npx shadcn-vue@latest init` once).',
    inputSchema: {
      slug: z.string().describe("Install slug, e.g. 'command-palette'."),
      packageManager: z.enum(['bun', 'npm', 'pnpm', 'yarn']).default('npm').describe('Package manager. Defaults to npm.'),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ slug, packageManager }) => {
    if (!validSlug(slug)) return error('A slug is lowercase letters, digits and dashes, e.g. "button-base".')
    const pm = packageManager as PackageManager
    return json({
      slug,
      packageManager: pm,
      command: installCommand(slug, pm),
      url: `${base(env)}/r/${slug}.json`,
      all: PACKAGE_MANAGERS.map(each => ({ packageManager: each, command: installCommand(slug, each) })),
    })
  })

  return server
}
