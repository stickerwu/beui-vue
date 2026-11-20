import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { expectedExamples } from './acceptance.mjs'

const root = new URL('../', import.meta.url)
const gallery = new URL('.artifacts/gallery/', root)
const parity = new URL('.artifacts/parity/', root)
const output = new URL('docs/public/review/', root)
const frames = new URL('frames/', output)
const catalog = JSON.parse(await readFile(new URL('catalog.json', root), 'utf8'))
const report = JSON.parse(await readFile(new URL('gallery.json', gallery), 'utf8'))
const measured = JSON.parse(await readFile(new URL('report.json', parity), 'utf8'))
const samples = ['button-base', 'tabs', 'before-after-slider', 'animated-toast-stack', 'line-chart', 'shader-background']
const byKey = new Map(report.results.map(item => [`${item.slug}--${item.variant}`, item]))
const expected = catalog.entries.flatMap(entry => expectedExamples(entry).map(example => `${entry.slug}--${example.slug}`))
if (report.baseline !== catalog.baseline || byKey.size !== expected.length) throw Error('Gallery does not match the pinned catalog')

await mkdir(frames, { recursive: true })
for (const key of expected) {
  const result = byKey.get(key)
  const names = ['react', 'vue'].map(side => `${key}-${side}.png`)
  if (result?.status !== 'captured' || !names.every(name => result.files.includes(name))) throw Error(`Incomplete gallery pair: ${key}`)
  for (const name of names) await copyFile(new URL(name, gallery), new URL(name, output))
}
for (const name of ['gallery.json', 'index.html']) await copyFile(new URL(name, gallery), new URL(name, output))
for (const slug of samples) {
  for (const theme of ['light', 'dark']) {
    const record = measured.find(item => item.slug === slug && item.theme === theme)
    if (record?.differences.length !== 3) throw Error(`Missing controlled scene: ${slug} ${theme}`)
    for (const phase of ['start', 'mid', 'end']) {
      for (const view of ['react', 'vue', 'diff']) {
        const name = `${slug}-${theme}-${phase}-${view}.png`
        await copyFile(new URL(name, parity), new URL(name, frames))
      }
    }
  }
}
await copyFile(new URL('report.json', parity), new URL('report.json', frames))
const imageCell = (slug, theme, phase, view) => {
  const name = `${slug}-${theme}-${phase}-${view}.png`
  return `<a href="${name}"><img width="640" height="400" loading="lazy" src="${name}" alt="${slug} ${theme} ${phase} ${view}"></a>`
}
const rows = measured.map(({slug, theme, differences}) => `<section id="${slug}-${theme}"><h2>${slug} · ${theme}</h2>${['start','mid','end'].map((phase, index) =>
  `<h3>${phase} · 差异像素 ${(100 * differences[index]).toFixed(2)}%</h3><div>${['react','vue','diff'].map(view => `<figure><figcaption>${view}</figcaption>${imageCell(slug,theme,phase,view)}</figure>`).join('')}</div>`
).join('')}</section>`).join('')
await writeFile(new URL('index.html', frames), `<!doctype html><html lang="zh-CN"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>样板关键帧 · beui-vue</title><style>body{font:16px/1.5 system-ui;margin:auto;max-width:1440px;padding:1rem}section>div{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:1rem}img{display:block;width:100%;height:auto}figure{margin:0}h2{margin-top:3rem}</style><main><h1>六个样板的受控场景</h1><p>固定视口 640 × 400。依次采集起始帧及操作后 80、780 毫秒的画面。Toast 动态加入第二条通知，Shader 切换到指定帧。每张图都可放大。</p><a href="report.json">下载数据</a>${rows}</main></html>`)
console.log(`${expected.length} gallery pairs and ${measured.length * 3} controlled comparisons ready for Pages`)
