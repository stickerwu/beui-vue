// Side-by-side parity capture: upstream React preview vs the Vue demo, same size and theme.
//
//   node scripts/cmp.mjs <slug> [variant] [--theme light|dark] [--out <dir>] [--motion] [--at 0,150,400]
//
// Needs the two dev servers (see .claude/launch.json):
//   Vue docs from source   BEUI_VUE_URL   (default http://127.0.0.1:5175)
//   React reference        BEUI_REACT_URL (default http://127.0.0.1:4194)
// Writes <out>/<slug>--<variant>-<theme>[-tNNN]-{react,vue,sbs}.png and prints the pixel mismatch ratio.
// By default motion is reduced and the shot is the settled state; --motion keeps animations and
// captures each --at offset (ms after ready), so entrance animations can be compared frame by frame.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'
import { expectedExamples } from './acceptance.mjs'
import { componentRoutes } from './routes.mjs'

const args = process.argv.slice(2)
const flag = (name, fallback) => { const i = args.indexOf(`--${name}`); return i < 0 ? fallback : args.splice(i, 2)[1] }
const has = name => { const i = args.indexOf(`--${name}`); if (i < 0) return false; args.splice(i, 1); return true }
const theme = flag('theme', 'light')
const outDir = new URL(flag('out', '.artifacts/cmp') + '/', new URL('../', import.meta.url))
const motion = has('motion')
const offsets = flag('at', motion ? '0,120,300,800' : '').split(',').filter(Boolean).map(Number)
const [slug, variantArg] = args
if (!slug) { console.error('usage: node scripts/cmp.mjs <slug> [variant] [--theme light|dark] [--motion] [--at ms,ms]'); process.exit(2) }

const vueURL = process.env.BEUI_VUE_URL ?? 'http://127.0.0.1:5175'
const reactURL = process.env.BEUI_REACT_URL ?? 'http://127.0.0.1:4194'
const {entries} = JSON.parse(await readFile(new URL('../catalog.json', import.meta.url), 'utf8'))
const entry = entries.find(e => e.slug === slug)
if (!entry) { console.error(`Unknown slug ${slug}`); process.exit(2) }
const examples = expectedExamples(entry)
const example = variantArg ? examples.find(e => e.slug === variantArg) : examples[0]
if (!example) { console.error(`Unknown variant. Variants: ${examples.map(e => e.slug).join(', ')}`); process.exit(2) }
const path = componentRoutes(entries).paths.get(slug)
await mkdir(outDir, {recursive:true})

const browser = await chromium.launch()
const context = opts => browser.newContext({viewport:{width:1280, height:900}, deviceScaleFactor:1, locale:'en-US', timezoneId:'UTC', colorScheme:theme, reducedMotion:motion ? 'no-preference' : 'reduce', ...opts})
const errors = []
try {
  // Vue first: its demo frame decides the stage size the React preview gets.
  const vueCtx = await context()
  await vueCtx.addInitScript(t => localStorage.setItem('vitepress-theme-appearance', t), theme)
  const vue = await vueCtx.newPage()
  vue.on('pageerror', e => errors.push(`vue: ${e.message}`))
  vue.on('console', m => m.type() === 'error' && errors.push(`vue console: ${m.text()}`))
  await vue.goto(`${vueURL}${path}?${new URLSearchParams({variant:example.slug})}`, {waitUntil:'domcontentloaded', timeout:60000})
  // Pages with several examples render one frame per example, tagged with data-variant.
  const frame = examples.length > 1 ? `.beui-demo[data-variant="${example.slug}"]` : '.beui-demo'
  const vueStage = vue.locator(`${frame}[data-ready=true]`).first()
  await vueStage.waitFor({timeout:60000})
  await vueStage.scrollIntoViewIfNeeded()
  await vue.evaluate(() => document.fonts.ready)
  const box = await vueStage.boundingBox()
  const size = {width:Math.round(box.width), height:Math.round(box.height)}
  const font = await vue.evaluate(() => getComputedStyle(document.querySelector('.beui-demo')).fontFamily)

  const reactCtx = await context()
  const react = await reactCtx.newPage()
  react.on('pageerror', e => errors.push(`react: ${e.message}`))
  await react.goto(`${reactURL}/?${new URLSearchParams({original:'1', slug:example.previewKey, theme})}`, {waitUntil:'domcontentloaded', timeout:60000})
  const reactStage = react.locator('body[data-ready=true] #stage')
  await reactStage.waitFor({timeout:60000})
  await react.evaluate(() => document.fonts.ready)
  await reactStage.evaluate((node, {size, font, dark}) => {
    Object.assign(node.style, {width:`${size.width}px`, height:`${size.height}px`, padding:'0', fontFamily:font, fontSize:'', lineHeight:'', background:dark ? '#111' : '#fff', color:dark ? '#fafafa' : '#111'})
  }, {size, font, dark:theme === 'dark'})

  const shoot = async (page, stage) => stage.screenshot({timeout:15000, animations:motion ? 'allow' : 'disabled'})
  const frames = offsets.length ? offsets : [null]
  for (const at of frames) {
    const shots = {}
    if (at !== null) {
      // Re-mount both so the entrance plays from zero, then sample at the same offset.
      await Promise.all([vue.reload(), react.reload()])
      await Promise.all([vue.locator(`${frame}[data-ready=true]`).first().waitFor(), react.locator('body[data-ready=true] #stage').waitFor()])
      await react.locator('#stage').evaluate((node, {size, font, dark}) => Object.assign(node.style, {width:`${size.width}px`, height:`${size.height}px`, padding:'0', fontFamily:font, background:dark ? '#111' : '#fff', color:dark ? '#fafafa' : '#111'}), {size, font, dark:theme === 'dark'})
      await Promise.all([vue.waitForTimeout(at), react.waitForTimeout(at)])
    } else {
      await Promise.all([vue, react].map(p => p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))))
    }
    shots.vue = await shoot(vue, vue.locator(frame).first())
    shots.react = await shoot(react, react.locator('#stage'))
    const tag = `${slug}--${example.slug}-${theme}${at === null ? '' : `-t${at}`}`
    const a = PNG.sync.read(shots.react), b = PNG.sync.read(shots.vue)
    const w = Math.min(a.width, b.width), h = Math.min(a.height, b.height)
    const crop = img => { const o = new PNG({width:w, height:h}); PNG.bitblt(img, o, 0, 0, w, h, 0, 0); return o.data }
    const ratio = pixelmatch(crop(a), crop(b), null, w, h, {threshold:0.15}) / (w * h)
    const sbs = new PNG({width:a.width + b.width + 8, height:Math.max(a.height, b.height)})
    for (let i = 0; i < sbs.data.length; i += 4) sbs.data.set([255, 0, 255, 255], i)
    PNG.bitblt(a, sbs, 0, 0, a.width, a.height, 0, 0)
    PNG.bitblt(b, sbs, 0, 0, b.width, b.height, a.width + 8, 0)
    await writeFile(new URL(`${tag}-react.png`, outDir), shots.react)
    await writeFile(new URL(`${tag}-vue.png`, outDir), shots.vue)
    await writeFile(new URL(`${tag}-sbs.png`, outDir), PNG.sync.write(sbs))
    console.log(`${tag}  mismatch ${(ratio * 100).toFixed(2)}%  (left React ${a.width}x${a.height}, right Vue ${b.width}x${b.height})  -> ${new URL(`${tag}-sbs.png`, outDir).pathname.slice(1)}`)
  }
  console.log(`variants: ${examples.map(e => e.slug).join(', ')}`)
} finally {
  await browser.close()
}
if (errors.length) { console.log('errors:\n  ' + [...new Set(errors)].join('\n  ')); process.exitCode = 1 }
