// Full-page comparison of a component docs page: beui.dev (live) vs the Vue docs (English).
//
//   node scripts/page-cmp.mjs <upstream path> [--vue <path>] [--theme light|dark] [--width 1440]
//
// Writes .artifacts/page-cmp/<name>-{react,vue}.png and an outline of each page's main column
// (headings, section ids, tables, text sizes) so structure and copy can be diffed.
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const flag = (name, fallback) => { const i = args.indexOf(`--${name}`); return i < 0 ? fallback : args.splice(i, 2)[1] }
const theme = flag('theme', 'light')
const width = Number(flag('width', '1440'))
const vuePath = flag('vue', undefined)
const [path] = args
if (!path) { console.error('usage: node scripts/page-cmp.mjs /components/agents/message-scroller'); process.exit(2) }
const vueURL = process.env.BEUI_VUE_URL ?? 'http://127.0.0.1:5173'
const reactURL = process.env.BEUI_REACT_URL_SITE ?? 'https://beui.dev'
const outDir = new URL('../.artifacts/page-cmp/', import.meta.url)
await mkdir(outDir, { recursive: true })
const name = path.replace(/^\//, '').replaceAll('/', '_')

const browser = await chromium.launch()
async function capture(url, side) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1, locale: 'en-US', colorScheme: theme, reducedMotion: 'reduce' })
  await context.addInitScript(t => { try { localStorage.setItem('theme', t); localStorage.setItem('vitepress-theme-appearance', t) } catch {} }, theme)
  const page = await context.newPage()
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(1500)
  const outline = await page.evaluate(() => {
    const main = document.querySelector('main') ?? document.body
    const rows = []
    const walk = el => {
      for (const node of el.children) {
        const tag = node.tagName.toLowerCase()
        const style = getComputedStyle(node)
        if (style.display === 'none' || node.closest('[aria-hidden="true"]') && tag !== 'div') continue
        if (/^h[1-6]$/.test(tag) || tag === 'section' && node.id || tag === 'table' || tag === 'nav' && node.getAttribute('aria-label')) {
          const r = node.getBoundingClientRect()
          rows.push(`${tag}${node.id ? '#' + node.id : ''} ${Math.round(r.top + scrollY)}px ${style.fontSize}/${style.fontWeight} "${(node.getAttribute('aria-label') ?? node.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 80)}"`)
        }
        walk(node)
      }
    }
    walk(main)
    return rows
  })
  await page.screenshot({ path: fileURLToPath(new URL(`${name}-${side}-${theme}.png`, outDir)), fullPage: true })
  await context.close()
  return outline
}
const react = await capture(reactURL + path, 'react')
const vue = await capture(vueURL + (vuePath ?? `/en${path}`), 'vue')
await writeFile(new URL(`${name}-${theme}.txt`, outDir), `# React\n${react.join('\n')}\n\n# Vue\n${vue.join('\n')}\n`)
console.log('# React'); console.log(react.join('\n'))
console.log('\n# Vue'); console.log(vue.join('\n'))
await browser.close()
