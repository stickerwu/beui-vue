import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { expectedExamples } from './acceptance.mjs'

const root = new URL('../', import.meta.url)
const {baseline, entries} = JSON.parse(await readFile(new URL('catalog.json', root), 'utf8'))
const directory = new URL('.artifacts/gallery/', root)
const options = process.argv.slice(2)
const tasks = entries.filter(entry => !options.length || options.includes(entry.slug))
  .flatMap(entry => expectedExamples(entry).map(example => ({entry, example})))
const {createServer} = await import(new URL('../../node_modules/vite/dist/node/index.js', import.meta.url))
const server = await createServer({
  configFile:fileURLToPath(new URL('parity/vite.config.mts', root)),
  server:{port:4194}, logLevel:'error',
})
const docs = spawn(process.execPath, [fileURLToPath(new URL('scripts/preview.mjs', root))], {
  stdio:['ignore','pipe','inherit'], env:{...process.env, BEUI_PREVIEW_PORT:'4195'},
})
let browser
const results = []
try {
  await mkdir(directory, {recursive:true})
  await server.listen()
  for (let attempt = 0; attempt < 80; attempt++) {
    if ((await fetch('http://127.0.0.1:4195/beui-vue/').catch(()=>null))?.ok) break
    await delay(200)
  }
  browser = await chromium.launch()
  async function capture(task) {
    const {entry, example} = task
    const id = `${entry.slug}--${example.slug}`
    const result = {slug:entry.slug, variant:example.slug, reference:example.previewKey, status:'captured', files:[], errors:[]}
    const shots = {}
    for (const side of ['react','vue']) {
      const page = await browser.newPage({viewport:{width:960,height:720},deviceScaleFactor:1,locale:'en-US',timezoneId:'UTC',colorScheme:'light',reducedMotion:'reduce'})
      page.on('pageerror',error=>result.errors.push(`${side}: ${error.message}`))
      try {
        const reference = `http://127.0.0.1:4194/?${new URLSearchParams({original:'1',slug:example.previewKey})}`
        const address = side === 'react' ? reference : `http://127.0.0.1:4195/beui-vue/components/${entry.slug}?${new URLSearchParams({variant:example.slug})}`
        await page.goto(address, {waitUntil:'domcontentloaded',timeout:20000})
        const selector = side === 'react' ? 'body[data-ready=true] #stage' : '.beui-demo[data-ready=true]'
        const stage = page.locator(selector)
        await stage.waitFor({timeout:18000})
        await page.evaluate(async()=>{await document.fonts.ready})
        await stage.evaluate(node=>{node.style.cssText='position:relative;display:grid;align-content:center;justify-items:center;box-sizing:border-box;width:640px;height:400px;margin:0;padding:32px;border:0;border-radius:0;overflow:clip;background:white;color:#111;font:16px/1.5 Arial,sans-serif'})
        await stage.evaluate(node => Promise.race([
          Promise.allSettled([...node.querySelectorAll('img')].map(image => image.decode())),
          new Promise(resolve => setTimeout(resolve, 2500)),
        ]))
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
        const file = `${id}-${side}.png`
        const bytes = await stage.screenshot({timeout:10000,animations:'disabled'})
        await writeFile(new URL(file,directory),bytes)
        shots[side] = bytes
        result.files.push(file)
      } catch (error) {
        result.errors.push(`${side}: ${error.message.split('\n')[0]}`)
      } finally {
        await page.close()
      }
    }
    if (result.errors.length || !shots.react || !shots.vue) result.status='capture-error'
    results.push(result)
    console.log(`${results.length}/${tasks.length} ${id} ${result.status}`)
  }
  let cursor = 0
  async function worker() { while (cursor<tasks.length) await capture(tasks[cursor++]) }
  await Promise.all(Array.from({length:3}, worker))
  results.sort((left,right)=>`${left.slug}-${left.variant}`.localeCompare(`${right.slug}-${right.variant}`))
  const report = {baseline, note:'Independent upstream and Vue default demos. These are review inputs. The demo data and input sequences must be aligned before judging parity.', results}
  await writeFile(new URL(options.length?'selected.json':'gallery.json',directory),JSON.stringify(report,null,2)+'\n')
  if (!options.length) {
    const escape = value => String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    const cards = results.map(result => `<section id="${escape(result.slug)}--${escape(result.variant)}"><h2>${escape(result.slug)} <small>${escape(result.variant)}</small></h2><div>${result.files.map(file=>`<figure><figcaption>${file.endsWith('-vue.png')?'Vue 3':'上游 React'}</figcaption><a href="${escape(file)}"><img width="640" height="400" style="height:auto" loading="lazy" alt="${escape(file)}" src="${escape(file)}"></a></figure>`).join('')}</div>${result.errors.map(error=>`<p>${escape(error)}</p>`).join('')}</section>`).join('')
    await writeFile(new URL('index.html',directory), `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>beui-vue 演示对照</title><style>body{font:16px/1.45 system-ui;margin:auto;max-width:1400px;padding:2rem;color:#182125;background:#f8faf9}section{margin:2rem 0}section>div{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,400px),1fr));gap:1rem}figure{margin:0}figcaption,small{color:#566368;font-weight:400}img{display:block;width:100%;aspect-ratio:8/5;background:white;border:1px solid #dce2e3}input{padding:.6rem;font:inherit}</style><h1>beui-vue 演示对照</h1><p>上游 ${escape(baseline.slice(0,7))} · ${results.length} 组演示 · 640 × 400 · 浅色 · 减少动态效果</p><label>筛选组件 <input type="search" id="filter"></label>${cards}<script>document.querySelector('#filter').oninput=event=>document.querySelectorAll('section').forEach(section=>section.hidden=!section.querySelector('h2').textContent.includes(event.target.value.trim()))</script></html>`)
  }
  if (results.some(result => result.status==='capture-error')) process.exitCode=1
} finally {
  await browser?.close()
  await server.close()
  docs.kill()
}
