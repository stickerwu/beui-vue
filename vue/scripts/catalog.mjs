import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { readPorts } from './ports.mjs'

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
const {registry, INSTALL_SLUGS} = await import(moduleURL(pinnedModule('lib/registry.ts').replace('@/lib/agent-guides', guides)))
const entries = registry.flatMap(category => category.components.flatMap(page => {
  const variants = page.examples?.filter(example => example.installSlug) ?? []
  const section = ['charts', 'casino'].includes(category.slug) ? category.slug : `components/${category.slug}`
  return (variants.length ? variants : [page]).map(item => ({
    slug: item.installSlug || page.slug, category: category.slug, title: item.name,
    page: `https://beui.dev/${section}/${page.slug}`, source: item.file,
    credit: item.credit || page.credit || null,
    examples: (variants.length ? [item] : page.examples ?? []).map(example => ({slug: example.slug, title: example.name, source: example.previewFile, credit: example.credit || null})),
  }))
}))
if (entries.length !== 160 || new Set(entries.map(entry => entry.slug)).size !== 160 || JSON.stringify(entries.map(item => item.slug)) !== JSON.stringify(INSTALL_SLUGS)) throw Error('Pinned registry mismatch')
for (const slug of Object.keys(ports)) if (!INSTALL_SLUGS.includes(slug)) throw Error(`Unknown port: ${slug}`)
const snapshotURL = new URL('catalog.json', root)
const snapshot = JSON.stringify({baseline, entries}, null, 2) + '\n'
if (process.argv.includes('--snapshot')) await writeFile(snapshotURL, snapshot)
else if (snapshot !== await readFile(snapshotURL, 'utf8')) throw Error('Run catalog.mjs --snapshot to review baseline changes')

if (process.argv.includes('--docs')) {
  const docs = new URL('docs/', root)
  await mkdir(new URL('components/', docs), {recursive:true})
  const groups = {motion:'基础组件',blocks:'组合区块',agents:'AI 界面',charts:'图表',casino:'游戏'}
  let catalog = '# 组件目录\n\n按上游安装条目标记 Vue 实现进度。\n'
  for (const [key, label] of Object.entries(groups)) {
    catalog += `\n## ${label}\n\n| 条目 | Vue 状态 |\n| --- | --- |\n`
    for (const entry of entries.filter(entry => entry.category === key)) {
      const port = ports[entry.slug]
      const stage = port ? '已实现 · 待还原验收' : '待迁移'
      catalog += `| [${entry.title}](./components/${entry.slug}) | ${stage} |\n`
      let text = `# ${entry.title}\n\n${stage} · [上游演示](${entry.page}) · [固定版本源码](https://github.com/starc007/ui-components/blob/${baseline}/${entry.source})\n`
      if (entry.credit) text += `\n原设计：[${entry.credit.name}](${entry.credit.url})\n`
      if (port) {
        const demo = await readFile(new URL(`examples/${entry.slug}.vue`, docs), 'utf8')
        text += `\n<script setup>\nimport DemoFrame from '../.vitepress/DemoFrame.vue'\nimport Demo from '../examples/${entry.slug}.vue'\n</script>\n\n## 预览\n\n<DemoFrame><Demo /></DemoFrame>\n\n## 用法\n\n\`\`\`vue\n${demo.trim()}\n\`\`\`\n\n## API\n\n${port.api}\n`
      }
      if (entry.examples.length) text += '\n## 上游变体\n\n' + entry.examples.map(example => `- [${example.title}](https://github.com/starc007/ui-components/blob/${baseline}/${example.source})${example.credit ? ` · ${example.credit.name}` : ''}`).join('\n') + '\n'
      await writeFile(new URL(`components/${entry.slug}.md`, docs), text)
    }
  }
  await writeFile(new URL('catalog.md', docs), catalog)
}
console.log(`${entries.length} pinned install targets, ${Object.keys(ports).length} Vue ports registered`)
