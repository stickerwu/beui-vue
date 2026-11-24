// Head tags shared by every page: share image and site name, plus the JSON-LD and
// sitemap dates that depend on the component catalog. Imported by config.mts.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { siteURL as site } from '../../scripts/routes.mjs'

export const repository = 'https://github.com/stickerwu/beui-vue'
export const socialImage = `${site}brand/social.png`

type CatalogPage = {
  slug: string
  title: string
  description: string
  zh: { title?: string }
  category: string
  path: string
  sourceUpdatedAt: string | null
  entries: { slug: string; title: string; path: string }[]
}
type CatalogSection = { slug: string; name: string; path: string; zh: { name: string } }

// Written by `pnpm docs:prepare` (scripts/catalog.mjs) before every build.
const catalog: { pages: CatalogPage[]; sections: CatalogSection[] } = JSON.parse(readFileSync(new URL('./catalog-data.json', import.meta.url), 'utf8'))

/** Page or variant at a site path (`/components/motion/button`, `/components/motion/button/button-base`). */
function catalogEntry(path: string) {
  for (const page of catalog.pages) {
    if (page.path === path) return { page, variant: undefined }
    const variant = page.entries.find(entry => entry.path === path && entry.path !== page.path)
    if (variant) return { page, variant }
  }
  return undefined
}

function gitDate(...files: string[]) {
  try {
    return execFileSync('git', ['log', '-1', '--format=%cs', '--', ...files], { cwd: fileURLToPath(new URL('../', import.meta.url)), encoding: 'utf8' }).trim() || undefined
  } catch {
    return undefined
  }
}

const newest = (dates: (string | null | undefined)[]) => dates.filter((date): date is string => Boolean(date)).sort().at(-1)

const guideDates: Record<string, string | undefined> = {
  'docs/motion-patterns': gitDate('docs/motion-patterns.md', '.vitepress/theme/guides/MotionGuide.vue', '.vitepress/theme/guides/motion-copy.en.ts', '.vitepress/theme/guides/motion-copy.zh.ts'),
  'docs/ai-agents': gitDate('docs/ai-agents.md', '.vitepress/theme/guides/AgentGuidePage.vue', '.vitepress/theme/guides/agent-copy.en.ts', '.vitepress/theme/guides/agent-copy.zh.ts'),
}
const installDate = gitDate('install.md', 'en/install.md')
const siteDate = newest(catalog.pages.map(page => page.sourceUpdatedAt))

/** `<lastmod>` for a site path without the locale prefix or slashes at either end. */
export function lastModified(path: string) {
  if (path in guideDates) return guideDates[path]
  if (path === 'install') return installDate
  const entry = catalogEntry(`/${path}`)
  if (entry) return entry.page.sourceUpdatedAt ?? undefined
  const section = catalog.sections.find(item => item.path === `/${path}`)
  if (section) return newest(catalog.pages.filter(page => page.category === section.slug).map(page => page.sourceUpdatedAt))
  return siteDate
}

const websiteId = `${site}#website`
const maintainer = { '@type': 'Person', name: 'stickerwu', url: 'https://github.com/stickerwu' }
const library = {
  codeRepository: repository,
  programmingLanguage: ['TypeScript', 'Vue'],
  runtimePlatform: 'Vue 3.5',
  license: `${repository}/blob/main/LICENSE`,
}

/**
 * JSON-LD for one page: the site and the library on the home page, breadcrumbs everywhere
 * else, plus SoftwareSourceCode on component pages and TechArticle on guides.
 */
export function structuredData(path: string, url: string, lang: 'zh' | 'en', page: { title: string; description: string }) {
  const localized = (target: string) => new URL(lang === 'en' ? `en/${target}` : target, site).href
  const inLanguage = lang === 'en' ? 'en' : 'zh-CN'
  const crumbs = (items: [string, string][]) => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [[lang === 'en' ? 'Home' : '首页', ''] as [string, string], ...items]
      .map(([name, target], index) => ({ '@type': 'ListItem', position: index + 1, name, item: localized(target) })),
  })

  if (path === '') {
    return [
      { '@context': 'https://schema.org', '@type': 'WebSite', '@id': websiteId, url: site, name: 'beui-vue', inLanguage: ['zh-CN', 'en'], description: page.description, publisher: maintainer },
      { '@context': 'https://schema.org', '@type': 'SoftwareSourceCode', name: 'beui-vue', description: page.description, url, image: socialImage, ...library, isBasedOn: 'https://github.com/starc007/ui-components', maintainer, isPartOf: { '@id': websiteId } },
    ]
  }

  const found = catalogEntry(`/${path}`)
  if (found) {
    const { page: entry, variant } = found
    const section = catalog.sections.find(item => item.slug === entry.category)
    const name = lang === 'en' ? entry.title : entry.zh.title ?? entry.title
    const items: [string, string][] = []
    if (section) items.push([lang === 'en' ? section.name : section.zh.name, section.path.slice(1)])
    items.push([name, entry.path.slice(1)])
    if (variant) items.push([variant.title, variant.path.slice(1)])
    return [crumbs(items), {
      '@context': 'https://schema.org',
      '@type': 'SoftwareSourceCode',
      name: variant ? `${variant.title} (${name})` : name,
      description: page.description,
      url,
      image: socialImage,
      inLanguage,
      ...library,
      ...(entry.sourceUpdatedAt ? { dateModified: entry.sourceUpdatedAt } : {}),
      isBasedOn: `https://beui.dev${entry.path}`,
      author: maintainer,
      isPartOf: { '@id': websiteId },
    }]
  }

  const section = catalog.sections.find(item => item.path === `/${path}`)
  if (section) {
    const name = lang === 'en' ? section.name : section.zh.name
    return [crumbs([[name, path]]), { '@context': 'https://schema.org', '@type': 'CollectionPage', name: page.title, description: page.description, url, inLanguage, isPartOf: { '@id': websiteId } }]
  }

  if (path in guideDates) {
    return [crumbs([[page.title, path]]), {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: page.title,
      description: page.description,
      url,
      image: socialImage,
      inLanguage,
      ...(guideDates[path] ? { dateModified: guideDates[path] } : {}),
      author: maintainer,
      isPartOf: { '@id': websiteId },
    }]
  }

  return [crumbs([[page.title, path]])]
}

/**
 * `/llms-full.txt`: every page with its description, install slugs and registry item, so an
 * answer engine or agent can pick a component without crawling each page.
 */
export function llmsFull() {
  const lines = [
    '# beui-vue',
    '',
    '> Animated Vue 3 components and interface blocks: the Vue port of beUI (beui.dev), built with motion-v and TypeScript, with Nuxt SSR support. MIT licensed, maintained by stickerwu.',
    '',
    'Install any item into a project that has a components.json:',
    '',
    '    npx shadcn-vue@latest add @beui-vue/<slug>',
    '',
    `Or install the preview package from the GitHub Release (${repository}/releases), then \`import 'beui-vue/style.css'\`.`,
    '',
    `- Docs: ${site} (中文), ${site}en/ (English)`,
    `- Registry index (shadcn-vue): ${site}r/index.json, one item per slug at ${site}r/<slug>.json`,
    `- MCP server (Streamable HTTP, no key): ${site}mcp`,
    `- Agent skill: npx skills add stickerwu/beui-vue --skill beui-vue`,
    `- Source: ${repository}`,
    '',
  ]
  for (const section of catalog.sections) {
    lines.push(`## ${section.name}`, '')
    for (const page of catalog.pages.filter(item => item.category === section.slug)) {
      const slugs = page.entries.map(entry => `\`${entry.slug}\``).join(', ')
      lines.push(`### ${page.title}`, '', page.description, '')
      lines.push(`- Page: ${site}en${page.path} (中文: ${site}${page.path.slice(1)})`)
      lines.push(`- Install slug${page.entries.length > 1 ? 's' : ''}: ${slugs}`)
      lines.push(`- Registry item: ${site}r/${page.entries[0].slug}.json`, '')
    }
  }
  return lines.join('\n')
}
