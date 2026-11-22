import { execFileSync } from 'node:child_process'
import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { readPorts } from './ports.mjs'
import { expectedExamples } from './acceptance.mjs'
import { componentRoutes } from './routes.mjs'
import { apiDocs } from './api-docs.mjs'

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
  const {paths, groups: routeGroups} = componentRoutes(entries)
  const packageSource = new URL('packages/ui/src/', root)
  const exports = new Map()
  for (const filename of await readdir(packageSource, {recursive: true})) {
    if (!filename.endsWith('.ts')) continue
    const file = new URL(filename.replaceAll('\\', '/'), packageSource)
    const source = await readFile(file, 'utf8')
    for (const match of source.matchAll(/export \{\s*default as (\w+)\s*\} from '([^']+\.vue)'/g)) {
      exports.set(match[1], new URL(match[2], file))
    }
  }
  // Section copy follows beui.dev's Docs.category messages, with React → Vue (and without the
  // Tailwind/shadcn wording, which does not apply to this package).
  const sectionCopy = {
    motion: ['Components', '/components/motion', 'Animated Vue components', 'Explore free, open-source animated Vue components built with Motion. Copy the TypeScript source into your app and customize every interaction.', 'All animated components'],
    blocks: ['Blocks', '/components/blocks', 'Animated Vue UI blocks', 'Explore product-ready animated Vue blocks built with Motion. Copy complete interactions into your app and adapt the source to your product.', 'All animated blocks'],
    agents: ['AI Agents', '/components/agents', 'Animated AI agent components', 'Build clear, responsive AI experiences with open-source Vue components for agent reasoning, progress, tool activity, and conversation states.', 'All agent components'],
    charts: ['Charts', '/charts', 'Animated Vue charts', 'Explore interactive activity heatmaps, monthly returns, and price target charts. Copy the Vue source and customize it for your data.', 'All charts'],
    casino: ['Casino', '/casino', 'Animated Vue casino games', 'Explore animated crash, mines, plinko and slide games with fair built-in outcomes or server-decided results. Copy the Vue source and wire it to your own game logic.', 'All casino games'],
  }
  const guidesZh = await readJson('.vitepress/theme/i18n/guides.zh.json').catch(() => ({}))
  const {componentDates} = await import(moduleURL(pinnedModule('lib/component-dates.ts')))
  const nativeCatalog = JSON.parse(execFileSync('git', ['show', `${baseline}:lib/native/catalog.json`], {cwd: repo, encoding: 'utf8', maxBuffer: 1 << 28}))
  const isNewBadge = item => item.badge === 'new' && Date.parse(`${item.launchedAt}T00:00:00Z`) + 7 * 86400000 > Date.now()
  const creditOf = credit => credit ? {name: credit.name, url: credit.url, avatar: credit.avatar ?? null} : null
  // Home tiles show what beui.dev's LandingComponentCard shows: the page-level preview
  // (`<category>/<page slug>`) when one exists, otherwise the first example.
  const previewKeys = new Set([...execFileSync('git', ['show', `${baseline}:components/previews/index.tsx`], {cwd: repo, encoding: 'utf8'}).matchAll(/^\s*"([a-z]+\/[a-z0-9-]+)":/gm)].map(match => match[1]))
  const tileOf = (category, page, group) => {
    const examples = group.flatMap(entry => (entry.examples ?? []).map(example => ({slug: entry.slug, variant: entry.examples.length > 1 ? example.slug : null, key: example.previewKey})))
    const pageKey = `${category}/${page.slug}`
    const target = (previewKeys.has(pageKey) && examples.find(example => example.key === pageKey))
      || examples.find(example => example.key === page.examples?.[0]?.previewKey)
    return target ? {slug: target.slug, variant: target.variant} : {slug: group[0].slug, variant: null}
  }
  const pages = [...routeGroups].map(([path, group]) => {
    const page = registry.flatMap(category => category.components).find(page => page.slug === path.split('/').at(-1))
    const registryCategory = registry.find(category => category.components.includes(page)).slug
    const description = page.description.replaceAll('React', 'Vue')
    // Same credit rules as beui.dev: one shared contributor shows once under the title,
    // otherwise "Includes designs by" lists each contributor and links to their example.
    const exampleCredits = page.examples?.map(example => example.credit) ?? []
    const sharedCredit = exampleCredits.length > 0 && exampleCredits.every(credit => credit && credit.url === exampleCredits[0]?.url) ? exampleCredits[0] : undefined
    const pageCredit = page.credit ?? sharedCredit
    const creditGroups = pageCredit ? [] : Object.values((page.examples ?? []).reduce((groups, example) => {
      if (!example.credit) return groups
      groups[example.credit.url] ??= {credit: creditOf(example.credit), examples: []}
      groups[example.credit.url].examples.push(example.slug)
      return groups
    }, {}))
    const native = nativeCatalog.components.find(component => component.slug === page.slug)
    const guide = page.guide ? {
      introduction: page.guide.introduction,
      composition: page.guide.composition,
      connections: page.guide.connections.map(({slug, name, description}) => ({slug, name, description})),
    } : null
    return {
      slug: page.slug, title: page.name, description,
      zh: {...(pagesZh[page.slug] ?? {description}), ...(guidesZh[page.slug] ? {guide: guidesZh[page.slug]} : {})},
      category: group[0].category, path,
      relatedSlugs: relatedComponents(group[0].category, page.slug, 3).map(item => item.slug),
      launchedAt: page.launchedAt ?? null,
      isNew: isNewBadge(page),
      credit: creditOf(pageCredit), sharedCredit: Boolean(sharedCredit), creditGroups,
      guide,
      updatedAt: componentDates(group[0].category, page.slug).updatedAt,
      native: native ? {description: native.description} : null,
      tile: tileOf(registryCategory, page, group),
      entries: group.map(entry => ({
        slug: entry.slug, title: entry.title, category: entry.category, path: paths.get(entry.slug),
        pagePath: path, description,
      })),
    }
  })
  const sections = Object.entries(sectionCopy).map(([slug, [name, path, heading, description, allLabel]]) => ({
    slug, name, path, heading, description, allLabel, zh: sectionsZh[slug] ?? {name, heading, description, allLabel}, entries: pages.filter(page => page.category === slug),
  }))
  await writeFile(new URL('.vitepress/catalog-data.json', docs), JSON.stringify({pages, sections}, null, 2) + '\n')

  const apiZh = await readJson('.vitepress/theme/i18n/api.zh.json').catch(() => ({}))
  const missingZh = new Set()
  const apiGaps = {}
  const vueFileOf = name => exports.has(name) ? fileURLToPath(exports.get(name)) : undefined
  const registryPages = registry.flatMap(category => category.components)

  // Mirrors beui.dev's component page (src/routes/-pages/component-page.tsx):
  // - no examples: preview, then Install, then API Reference;
  // - examples: one block per example (title, file, credit, preview tabs, plus the API
  //   of its file — only the last block when every example shares one file), then Install;
  // - examples with their own install slug: Install and API inside each block instead.
  async function componentDocument(path, base, group, title, locale) {
    const parent = pages.find(page => page.path === new URL(group[0].page).pathname)
    const regPage = registryPages.find(page => page.slug === new URL(group[0].page).pathname.split('/').at(-1))
    // `base` is '' for the Chinese root locale and 'en/' for English; the extra
    // folder level moves every relative import one directory further from docs/.
    const prefix = '../'.repeat(path.split('/').length - 2 + base.split('/').filter(Boolean).length)
    const copy = locale === 'zh' ? {
      install: '安装', installDescription: '通过包管理器安装，或手动复制源码。', api: 'API 参考', preview: '预览', newBadge: '新',
      description: text => `${text} — 为 Vue 3 重制的 beUI 动画组件，附 TypeScript 示例、API 参考与原版源码。`,
    } : {
      install: 'Install', installDescription: 'Add it with your package manager, or copy the source manually.', api: 'API Reference', preview: 'Preview', newBadge: 'New',
      description: text => `${text} — beUI animated components rebuilt for Vue 3. TypeScript examples, API reference and original beUI source.`,
    }
    const localizeDocs = docs => locale === 'en' ? docs : docs.map(doc => ({...doc, rows: doc.rows.map(row => {
      if (row.description && !apiZh[row.description]) missingZh.add(row.description)
      return {...row, description: apiZh[row.description] ?? row.description}
    })}))
    const literal = value => JSON.stringify(value).replaceAll('<', '\\u003c')
    const imports = [`import DemoFrame from '${prefix}.vitepress/DemoFrame.vue'`, `import ComponentPreview from '${prefix}.vitepress/theme/ComponentPreview.vue'`, `import ApiTable from '${prefix}.vitepress/theme/ApiTable.vue'`, `import InstallationBlock from '${prefix}.vitepress/theme/InstallationBlock.vue'`, `import CreditLink from '${prefix}.vitepress/theme/CreditLink.vue'`]
    const declarations = []
    const blocks = []
    const showSharedCredit = !parent?.sharedCredit
    let pageInstall = null
    let pageApi = null
    const sectionHead = (id, heading) => `<div id="${id}" class="beui-example-section">\n<h2 class="beui-section-title">${heading}</h2>`
    for (const [index, entry] of group.entries()) {
      const port = ports[entry.slug]
      if (!port) continue
      const file = new URL(`examples/${entry.slug}.vue`, docs)
      const demo = await standaloneExample(await readFile(file, 'utf8'), file)
      const component = exports.get(port.name)
      const source = component ? await readFile(component, 'utf8') : demo
      const fileLabel = component ? fileURLToPath(component).split(/[\\/]/).pop() : `${port.name}.vue`
      imports.push(`import Demo${index} from '${prefix}examples/${entry.slug}.vue'`)
      declarations.push(`const usage${index} = ${literal(demo.trim())}`, `const source${index} = ${literal(source.trim())}`)
      const fallback = component ? fileURLToPath(component) : undefined
      const api = upstreamFile => {
        const {docs: apiDocsList, gaps} = apiDocs(upstreamFile, vueFileOf, fallback)
        if (gaps.length) apiGaps[`${entry.slug} (${upstreamFile})`] = gaps
        return localizeDocs(apiDocsList)
      }
      const variants = regPage.examples?.filter(example => example.installSlug) ?? []
      const ownInstall = variants.some(example => example.installSlug === entry.slug)
      const regExamples = ownInstall ? variants.filter(example => example.installSlug === entry.slug) : regPage.examples ?? []
      if (!regExamples.length) {
        declarations.push(`const api${index} = ${literal(api(regPage.file))}`)
        blocks.push(`<section id="preview" class="beui-preview-section">
<h2 class="beui-sr-only">${copy.preview}</h2>
<ComponentPreview slug="${entry.slug}" title="${entry.title}" :usage="usage${index}" :source="source${index}"><DemoFrame><Demo${index} /></DemoFrame></ComponentPreview>
</section>`)
        pageInstall = `<InstallationBlock import-name="${port.name}" />`
        pageApi = `api${index}`
        continue
      }
      const shareSource = regExamples.length > 1 && new Set(regExamples.map(example => example.file)).size === 1
      const exampleBlocks = regExamples.map((example, exampleIndex) => {
        const key = `${index}_${exampleIndex}`
        const showApi = !shareSource || exampleIndex === regExamples.length - 1
        const parts = [`<section id="${example.slug}" class="beui-example">
<div class="beui-example-head"><div class="beui-example-name"><h2 class="beui-example-title">${example.name}</h2>${isNewBadge(example) ? `<span class="beui-new-badge">${copy.newBadge}</span>` : ''}</div><code>${fileLabel}</code></div>`]
        if (example.credit && showSharedCredit) {
          declarations.push(`const credit${key} = ${literal(creditOf(example.credit))}`)
          parts.push(`<CreditLink class="beui-example-credit" :credit="credit${key}" />`)
        }
        const variantAttr = regExamples.length > 1 || (expectedExamples(entry).length > 1) ? ` variant="${example.slug}"` : ''
        parts.push(`<div id="${example.slug}-preview" class="beui-example-preview">
<ComponentPreview slug="${entry.slug}" title="${example.name}" :usage="usage${index}" :source="source${index}"><DemoFrame${variantAttr}><Demo${index} /></DemoFrame></ComponentPreview>
</div>`)
        if (ownInstall) parts.push(`${sectionHead(`${example.slug}-install`, copy.install)}\n<InstallationBlock import-name="${port.name}" />\n</div>`)
        if (showApi) {
          declarations.push(`const api${key} = ${literal(api(example.file))}`)
          parts.push(`<ApiTable id="${example.slug}-api-reference" heading="${copy.api}" :docs="api${key}" />`)
        }
        parts.push('</section>')
        return parts.join('\n')
      })
      blocks.push(exampleBlocks.join('\n\n'))
      if (!ownInstall) pageInstall = `<InstallationBlock import-name="${port.name}" />`
    }
    let body = `<div class="${regPage.examples?.length ? 'beui-examples' : 'beui-default-preview'}">\n\n${blocks.join('\n\n')}\n\n</div>`
    if (pageInstall) body += `\n\n<section id="install" class="beui-doc-section">
<h2 class="beui-section-title">${copy.install}</h2>
<p class="beui-section-description">${copy.installDescription}</p>
${pageInstall}
</section>`
    if (pageApi) body += `\n\n<ApiTable id="api-reference" heading="${copy.api}" :docs="${pageApi}" section />`
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

${body}
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
  // Review lists: upstream props the Vue port lacks, and API descriptions still untranslated.
  await mkdir(new URL('.artifacts/', root), {recursive: true})
  await writeFile(new URL('.artifacts/api-gaps.json', root), JSON.stringify(apiGaps, null, 1) + '\n')
  await writeFile(new URL('.artifacts/api-zh-missing.json', root), JSON.stringify([...missingZh].sort(), null, 1) + '\n')
  if (Object.keys(apiGaps).length || missingZh.size) console.log(`API review: ${Object.keys(apiGaps).length} entries with upstream props missing in Vue, ${missingZh.size} untranslated descriptions (.artifacts/api-*.json)`)
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
