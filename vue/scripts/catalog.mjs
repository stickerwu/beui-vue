import { execFileSync } from 'node:child_process'
import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { readPorts } from './ports.mjs'
import { approvedExamples, expectedExamples } from './acceptance.mjs'
import { componentRoutes } from './routes.mjs'

const baseline = 'c0a936f59eb767e263c0e81b93dd323511dc9b6b'
const root = new URL('../', import.meta.url)
const repo = fileURLToPath(new URL('../', root))
const ports = await readPorts()

function pinnedModule(path) {
  const file = execFileSync('git', ['show', `${baseline}:${path}`], {cwd: repo, encoding: 'utf8'})
  return ts.transpileModule(file, {compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022}}).outputText
}

const moduleURL = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
const guides = moduleURL(pinnedModule('lib/agent-guides.ts'))
const registryModule = moduleURL(pinnedModule('lib/registry.ts').replace('@/lib/agent-guides', guides))
const {registry, INSTALL_SLUGS} = await import(registryModule)
const entries = registry.flatMap(category => category.components.flatMap(page => {
  const variants = page.examples?.filter(example => example.installSlug) ?? []
  const section = ['charts', 'casino'].includes(category.slug) ? category.slug : `components/${category.slug}`
  return (variants.length ? variants : [page]).map(item => ({
    slug: item.installSlug || page.slug, category: category.slug, title: item.name,
    page: `https://beui.dev/${section}/${page.slug}`, source: item.file,
    credit: item.credit || page.credit || null,
    examples: (variants.length ? [item] : page.examples ?? []).map(example => ({slug: example.slug, title: example.name, source: example.previewFile, previewKey: example.previewKey, credit: example.credit || null})),
  }))
}))
if (entries.length !== 160 || new Set(entries.map(entry => entry.slug)).size !== 160 || JSON.stringify(entries.map(item => item.slug)) !== JSON.stringify(INSTALL_SLUGS)) throw Error('Pinned registry mismatch')
for (const slug of Object.keys(ports)) if (!INSTALL_SLUGS.includes(slug)) throw Error(`Unknown port: ${slug}`)
const snapshotURL = new URL('catalog.json', root)
const snapshot = JSON.stringify({baseline, entries}, null, 2) + '\n'
if (process.argv.includes('--snapshot')) await writeFile(snapshotURL, snapshot)
else if (snapshot !== await readFile(snapshotURL, 'utf8')) throw Error('Run catalog.mjs --snapshot to review baseline changes')

async function standaloneExample(source, file) {
  const imports = [...source.matchAll(/^import \{ (\w+) \} from '(\.[^']+)'$/gm)]
  for (const [statement, name, location] of imports) {
    const helper = await readFile(new URL(`${location}.ts`, file), 'utf8')
    const vueImports = new Set()
    const importsVue = /^import \{([^\n}]+)\} from 'vue'$/gm
    for (const code of [source, helper]) {
      for (const match of code.matchAll(importsVue)) {
        for (const variable of match[1].split(',').map(value=>value.trim())) vueImports.add(variable)
      }
    }
    // Docs-only plumbing: a DemoFrame can pin the example. Copyable usage never has a frame.
    const pinnedVariant = /^import \{ previewVariantKey \} from '[^']+'\n/m
    if (pinnedVariant.test(helper)) vueImports.delete('inject')
    const body = helper.replace(importsVue,'').replace(pinnedVariant,'')
      .replace(/^ *\/\/ Pinned by the surrounding DemoFrame[^\n]*\n/m,'')
      .replace('inject(previewVariantKey, undefined)','undefined as string | undefined')
      .trim().replace(`export function ${name}`,`function ${name}`)
    source = source.replace(importsVue,'').replace(statement,`import { ${[...vueImports].join(', ')} } from 'vue'\n\n${body}\n`)
  }
  const styles = [...source.matchAll(/<style scoped src="(\.[^"]+\.css)"><\/style>/g)]
  for (const [statement, location] of styles) {
    source = source.replace(statement, `<style scoped>\n${(await readFile(new URL(location, file), 'utf8')).trim()}\n</style>`)
  }
  return source
}

if (process.argv.includes('--docs')) {
  const relatedSource = pinnedModule('lib/seo.ts')
  const {relatedComponents} = await import(moduleURL(`import {registry, allComponents} from '${registryModule}'\n${relatedSource.slice(relatedSource.indexOf('const RELATED_FAMILIES'))}`))
  const docs = new URL('docs/', root)
  const readJson = async path => JSON.parse(await readFile(new URL(path, docs), 'utf8'))
  const pagesZh = await readJson('.vitepress/theme/i18n/pages.zh.json')
  const sectionsZh = await readJson('.vitepress/theme/i18n/sections.zh.json')
  const apiEn = await readJson('.vitepress/theme/i18n/api.en.json')
  const {paths, groups: routeGroups} = componentRoutes(entries)
  const packageSource = new URL('packages/ui/src/', root)
  const exports = new Map()
  for (const filename of await readdir(packageSource, {recursive: true})) {
    if (!filename.endsWith('.ts')) continue
    const file = new URL(filename.replaceAll('\\', '/'), packageSource)
    const source = await readFile(file, 'utf8')
    for (const match of source.matchAll(/export \{ default as (\w+) \} from '([^']+\.vue)'/g)) {
      exports.set(match[1], new URL(match[2], file))
    }
  }
  const sectionCopy = {
    motion: ['Components', '/components/motion', 'Animated Vue components', 'Explore free, open-source animated Vue components built with Motion. Bring the TypeScript source into your app and customize every interaction.'],
    blocks: ['Blocks', '/components/blocks', 'Animated interface blocks', 'Composed Vue interfaces, from command palettes and dynamic islands to forms, navigation and productivity tools.'],
    agents: ['AI Agents', '/components/agents', 'Components for AI interfaces', 'Build conversations, streaming responses and agent workflows with animated Vue components.'],
    charts: ['Charts', '/charts', 'Animated charts', 'Interactive SVG charts with responsive layouts, accessible data and motion that makes changes easy to follow.'],
    casino: ['Casino', '/casino', 'Interactive casino components', 'Animated game interfaces rebuilt for Vue, with keyboard controls and reduced-motion support.'],
  }
  const pages = [...routeGroups].map(([path, group]) => {
    const page = registry.flatMap(category => category.components).find(page => page.slug === path.split('/').at(-1))
    const description = page.description.replaceAll('React', 'Vue')
    return {
      slug: page.slug, title: page.name, description,
      zh: pagesZh[page.slug] ?? {description},
      category: group[0].category, path,
      relatedSlugs: relatedComponents(group[0].category, page.slug, 3).map(item => item.slug),
      launchedAt: page.launchedAt ?? null,
      isNew: page.badge === 'new' && Date.parse(`${page.launchedAt}T00:00:00Z`) + 7 * 86400000 > Date.now(),
      entries: group.map(entry => ({
        slug: entry.slug, title: entry.title, category: entry.category, path: paths.get(entry.slug),
        pagePath: path, description,
      })),
    }
  })
  const sections = Object.entries(sectionCopy).map(([slug, [name, path, heading, description]]) => ({
    slug, name, path, heading, description, zh: sectionsZh[slug] ?? {name, heading, description}, entries: pages.filter(page => page.category === slug),
  }))
  await writeFile(new URL('.vitepress/catalog-data.json', docs), JSON.stringify({pages, sections}, null, 2) + '\n')

  function propsFor(source) {
    const script = source.match(/<script setup[^>]*>([\s\S]*?)<\/script>/)?.[1]
    if (!script) return []
    const file = ts.createSourceFile('component.ts', script, ts.ScriptTarget.Latest, true)
    const types = new Map()
    for (const statement of file.statements) {
      if (ts.isInterfaceDeclaration(statement)) types.set(statement.name.text, statement)
      if (ts.isTypeAliasDeclaration(statement)) types.set(statement.name.text, statement.type)
    }
    let declaration
    function visit(node) {
      if (ts.isCallExpression(node) && node.expression.getText(file) === 'defineProps') declaration = node.typeArguments?.[0]
      ts.forEachChild(node, visit)
    }
    visit(file)
    if (declaration && ts.isTypeReferenceNode(declaration)) declaration = types.get(declaration.typeName.getText(file))
    if (!declaration || !('members' in declaration)) return []
    return declaration.members.filter(ts.isPropertySignature).map(member => ({
      name: member.name.getText(file), type: member.type?.getText(file) ?? 'unknown', required: !member.questionToken,
    }))
  }

  async function componentDocument(path, base, group, title, locale) {
    const parent = pages.find(page => page.path === new URL(group[0].page).pathname)
    // `base` is '' for the Chinese root locale and 'en/' for English; the extra
    // folder level moves every relative import one directory further from docs/.
    const prefix = '../'.repeat(path.split('/').length - 2 + base.split('/').filter(Boolean).length)
    const copy = locale === 'zh' ? {
      install: '安装', api: 'API 参考', credit: '原设计',
      evidence: (approved, total) => `beUI 源码与效果对照 · ${approved}/${total}`,
      demo: '上游演示', source: '固定版本源码', frames: '画面对照',
      description: text => `${text} — 为 Vue 3 重制的 beUI 动画组件，附 TypeScript 示例、API 参考与原版源码。`,
    } : {
      install: 'Install', api: 'API Reference', credit: 'Original design by',
      evidence: (approved, total) => `beUI source and visual verification · ${approved}/${total}`,
      demo: 'Original demo', source: 'Pinned upstream source', frames: 'compare frames',
      description: text => `${text} — beUI animated components rebuilt for Vue 3. TypeScript examples, API reference and original beUI source.`,
    }
    const imports = [`import DemoFrame from '${prefix}.vitepress/DemoFrame.vue'`, `import ComponentPreview from '${prefix}.vitepress/theme/ComponentPreview.vue'`, `import ApiTable from '${prefix}.vitepress/theme/ApiTable.vue'`, `import InstallationBlock from '${prefix}.vitepress/theme/InstallationBlock.vue'`]
    const declarations = []
    const blocks = []
    for (const [index, entry] of group.entries()) {
      const port = ports[entry.slug]
      if (!port) continue
      const file = new URL(`examples/${entry.slug}.vue`, docs)
      const demo = await standaloneExample(await readFile(file, 'utf8'), file)
      const component = exports.get(port.name)
      const source = component ? await readFile(component, 'utf8') : demo
      const literal = value => JSON.stringify(value).replaceAll('<', '\\u003c')
      imports.push(`import Demo${index} from '${prefix}examples/${entry.slug}.vue'`)
      declarations.push(`const usage${index} = ${literal(demo.trim())}`, `const source${index} = ${literal(source.trim())}`, `const props${index} = ${JSON.stringify(propsFor(source))}`)
      const section = group.length > 1 ? `## ${entry.title}\n\n` : ''
      const credit = entry.credit ? `\n${copy.credit} [${entry.credit.name}](${entry.credit.url})\n` : ''
      const approved = approvedExamples(entry, port).length
      const total = expectedExamples(entry).length
      const api = locale === 'en' ? apiEn[entry.slug] ?? port.api : port.api
      // Like beui.dev, a page with several examples shows each one in its own titled block.
      const examples = expectedExamples(entry)
      const previews = examples.length > 1
        ? examples.map(example => `<section id="${example.slug}" class="beui-example">
<div class="beui-example-head"><h2 class="beui-example-title">${example.title}</h2><code>${entry.slug}.vue</code></div>
<ComponentPreview slug="${entry.slug}" title="${example.title}" :usage="usage${index}" :source="source${index}"><DemoFrame variant="${example.slug}"><Demo${index} /></DemoFrame></ComponentPreview>
</section>`).join('\n\n')
        : `<ComponentPreview slug="${entry.slug}" title="${entry.title}" :usage="usage${index}" :source="source${index}"><DemoFrame><Demo${index} /></DemoFrame></ComponentPreview>`
      blocks.push(`${section}${credit}
${previews}

### ${copy.install}

<InstallationBlock import-name="${port.name}" />

### ${copy.api}

${api}

<ApiTable :rows="props${index}" />

<details class="beui-evidence"><summary>${copy.evidence(approved, total)}</summary>

[${copy.demo}](${entry.page}) · [${copy.source}](https://github.com/starc007/ui-components/blob/${baseline}/${entry.source})

${expectedExamples(entry).map(example => `- [${example.title} · ${copy.frames}](/review/index.html#${entry.slug}--${example.slug})`).join('\n')}

</details>`)
    }
    const description = locale === 'en' ? copy.description(title) : copy.description(title)
    const text = `---
title: ${JSON.stringify(title)}
description: ${JSON.stringify(description)}
componentPage: true
category: ${group[0].category}
pagePath: ${JSON.stringify(parent?.path || new URL(group[0].page).pathname)}
---

<script setup>
${imports.join('\n')}
${declarations.join('\n')}
</script>

${blocks.join('\n\n')}
`
    const target = new URL(`./${base}${path.slice(1)}.md`, docs)
    await mkdir(new URL('./', target), {recursive: true})
    await writeFile(target, text)
  }

  for (const entry of entries) {
    await unlink(new URL(`components/${entry.slug}.md`, docs)).catch(error => { if (error.code !== 'ENOENT') throw error })
    await unlink(new URL(`en/components/${entry.slug}.md`, docs)).catch(error => { if (error.code !== 'ENOENT') throw error })
  }
  for (const [path, group] of routeGroups) {
    const page = pages.find(item => item.path === path)
    for (const locale of ['zh', 'en']) {
      const base = locale === 'en' ? 'en/' : ''
      await componentDocument(path, base, group, page.title, locale)
      if (group.length > 1) for (const entry of group) await componentDocument(paths.get(entry.slug), base, [entry], entry.title, locale)
    }
  }
  for (const section of sections) {
    for (const locale of ['zh', 'en']) {
      const base = locale === 'en' ? 'en/' : ''
      const copy = locale === 'en' ? section : section.zh
      const target = new URL(`./${base}${section.path.slice(1)}.md`, docs)
      await mkdir(new URL('./', target), { recursive: true })
      await writeFile(target, `---\ntitle: ${JSON.stringify(copy.name)}\ndescription: ${JSON.stringify(copy.description)}\ncategoryPage: ${section.slug}\n---\n`)
    }
  }
  await writeFile(new URL('catalog.md', docs), '---\ntitle: 组件目录\ndescription: 浏览完整的 beui-vue 组件库，含在线 Vue 预览、TypeScript 示例与 API 参考。\ncategoryPage: all\n---\n')
  await mkdir(new URL('en/', docs), { recursive: true })
  await writeFile(new URL('en/catalog.md', docs), '---\ntitle: Component library\ndescription: Browse the complete beui-vue library, with live Vue previews, TypeScript examples and API references.\ncategoryPage: all\n---\n')
}
console.log(`${entries.length} pinned install targets, ${Object.keys(ports).length} Vue ports registered`)
