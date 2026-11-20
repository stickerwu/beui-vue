import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'
import { chromium } from '@playwright/test'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'
import { expectedExamples } from './acceptance.mjs'
import { performInput, planInput, scenarioFor } from './motion-review-inputs.mjs'

const root = new URL('../',import.meta.url)
const directory = new URL('.artifacts/motion-review/',root)
const {entries,baseline} = JSON.parse(await readFile(new URL('catalog.json',root),'utf8'))
const selected = process.argv.slice(2)
const referencePort = Number(process.env.BEUI_MOTION_REFERENCE_PORT || 4274)
const previewPort = Number(process.env.BEUI_MOTION_PREVIEW_PORT || 4275)
const concurrency = Math.max(1,Math.min(6,Number(process.env.BEUI_MOTION_WORKERS)||3))
const seed = 20261120
const clockStart = '2026-01-01T12:00:00.000Z'
const pausedAt = new Date(Date.parse(clockStart)+1000)
const dimensions = {width:640,height:400}
const frames = [{name:'start',at:0},{name:'mid',at:120},{name:'end',at:900}]
const tasks = entries.filter(entry=>!selected.length||selected.includes(entry.slug))
  .flatMap(entry=>expectedExamples(entry).flatMap(example=>['light','dark'].map(theme=>({entry,example,theme}))))
if (!tasks.length) throw Error('No matching component slugs')
const {createServer} = await import(new URL('../../node_modules/vite/dist/node/index.js',import.meta.url))
const reference = await createServer({
  configFile:fileURLToPath(new URL('parity/vite.config.mts',root)),
  cacheDir:fileURLToPath(new URL('.artifacts/motion-review-vite/',root)),
  server:{port:referencePort,strictPort:true},logLevel:'error',
})
const docs = spawn(process.execPath,[fileURLToPath(new URL('scripts/preview.mjs',root))],{
  stdio:['ignore','ignore','inherit'],env:{...process.env,BEUI_PREVIEW_PORT:String(previewPort)},
})
const report = {
  baseline,seed,clockStart,dimensions,frames,threshold:.1,deviceScaleFactor:1,fixtureSource:'Upstream React preview and Vue docs example',
  renderer:'Chromium',scheme:['light','dark'],motionPreference:'no-preference',timeZone:'UTC',
  measurement:'Times are milliseconds relative to the first frame of each mounted preview. Native animations and the JavaScript clock are sampled at each checkpoint.',
  inputs:'Named controls use accessible names when both fixtures provide a match. Positional controls, pointer coordinates and missing controls carry explicit inputEquivalence labels.',
  humanReview:'pending',results:[],
}
const selectionId = createHash('sha256').update(JSON.stringify([...selected].sort())).digest('hex').slice(0,16)
const reportName = selected.length ? `selection-${selectionId}.json` : 'report.json'
let browser

async function mergeRecapturedCases() {
  if (!selected.length) return
  const fullPath = new URL('report.json',directory)
  const previous = await readFile(fullPath,'utf8').then(JSON.parse).catch(()=>null)
  if (!previous || previous.baseline!==baseline || previous.seed!==seed || previous.clockStart!==clockStart) return
  const key = item=>[item.slug,item.variant,item.theme].join('/')
  const replacements = new Map(report.results.map(item=>[key(item),item]))
  previous.results = previous.results.map(item=>{
    const updated = replacements.get(key(item))
    if (updated && item.errors?.length) updated.previousAttempt = item.errors
    return updated ?? item
  })
  await writeFile(fullPath,JSON.stringify(previous,null,2)+'\n')
}

async function configure(page,theme) {
  await page.addInitScript(({seed,theme})=>{
    let state=seed>>>0
    Math.random=()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296}
    localStorage.setItem('vitepress-theme-appearance',theme)
  },{seed,theme})
  await page.clock.install({time:new Date(clockStart)})
  await page.clock.pauseAt(pausedAt)
}

async function openView(page,side,task) {
  const {entry,example,theme}=task
  const upstream=`http://127.0.0.1:${referencePort}/?${new URLSearchParams({original:'1',slug:example.previewKey,theme})}`
  const port=`http://127.0.0.1:${previewPort}/beui-vue/components/${entry.slug}?${new URLSearchParams({variant:example.slug})}`
  await configure(page,theme)
  await page.goto(side==='react'?upstream:port,{waitUntil:'domcontentloaded',timeout:45000})
  const stage=page.locator(side==='react'?'body[data-ready=true] #stage':'.beui-demo[data-ready=true]')
  const deadline=Date.now()+35000
  let mountMs=0
  while (!(await stage.count())) {
    if (Date.now()>=deadline) throw Error(`${side} failed to mount ${example.previewKey}`)
    await page.clock.runFor(16)
    mountMs+=16
    await delay(40)
  }
  await page.evaluate(()=>document.fonts.ready)
  await stage.evaluate((node,{theme,width,height})=>{
    document.documentElement.classList.toggle('dark',theme==='dark')
    const background=theme==='dark'?'#121212':'#fff'
    const foreground=theme==='dark'?'#eee':'#111'
    node.style.cssText=`position:fixed;inset:0 auto auto 0;z-index:2147483000;display:grid;align-content:center;justify-items:center;box-sizing:border-box;width:${width}px;height:${height}px;padding:32px;margin:0;border:0;border-radius:0;overflow:clip;background:${background};color:${foreground};font:16px/1.5 Arial,sans-serif;`
    for (const label of node.querySelectorAll('label')) {
      if (label.textContent.trim().startsWith('Example') && label.querySelector('select')) {
        label.dataset.motionReviewIgnore='true'
        label.style.display='none'
      }
    }
    for (const ancestor of (function*(){let element=node.parentElement;while(element&&element!==document.body){yield element;element=element.parentElement}})()) {
      ancestor.style.transform='none'
      ancestor.style.filter='none'
      ancestor.style.perspective='none'
      ancestor.style.contain='none'
    }
  },{theme,...dimensions})
  await page.clock.runFor(32)
  return {page,stage,side,mountMs}
}

async function freezeNativeAnimations(page,virtualMs) {
  return page.evaluate(elapsed=>{
    const state=globalThis.__beuiMotionCapture??={starts:new WeakMap(),paused:[],lastCapture:0}
    const active=document.getAnimations()
    for (const animation of active) {
      if (animation.playState!=='running') continue
      if (!state.starts.has(animation)) state.starts.set(animation,state.lastCapture)
      const time=elapsed-state.starts.get(animation)
      animation.pause()
      animation.currentTime=time
      state.paused.push(animation)
    }
    state.lastCapture=elapsed
    return active.length
  },virtualMs)
}

async function thaw(page) {
  await page.evaluate(()=>{
    for (const animation of globalThis.__beuiMotionCapture?.paused.splice(0)??[]) {
      if (animation.playState==='paused') animation.play()
    }
  })
}

async function shot(view,at) {
  const nativeAnimations=await freezeNativeAnimations(view.page,at)
  const bytes=await view.page.screenshot({clip:{x:0,y:0,...dimensions},animations:'allow',caret:'hide',timeout:12000})
  await thaw(view.page)
  return {bytes,nativeAnimations}
}

async function captureAttempt(task) {
  const {entry,example,theme}=task
  const prefix=`${entry.slug}--${example.slug}--${theme}`
  const result={slug:entry.slug,variant:example.slug,previewKey:example.previewKey,theme,review:'pending',status:'captured',frames:[],errors:[]}
  const contexts=await Promise.all(['react','vue'].map(()=>browser.newContext({viewport:{width:960,height:720},deviceScaleFactor:1,locale:'en-US',timezoneId:'UTC',colorScheme:theme,reducedMotion:'no-preference',permissions:['clipboard-write']})))
  try {
    const views=await Promise.all(contexts.map(async (context,index)=>{
      const page=await context.newPage()
      const side=index===0?'react':'vue'
      page.on('pageerror',error=>result.errors.push(`${side}: ${error.message}`))
      return openView(page,side,task)
    }))
    result.mountAdvanceMs=Object.fromEntries(views.map(view=>[view.side,view.mountMs]))
    result.input=await planInput(scenarioFor(entry),views)
    let elapsed=0
    for (const frame of frames) {
      if (frame.at>elapsed) await Promise.all(views.map(view=>view.page.clock.runFor(frame.at-elapsed)))
      const samples=await Promise.all(views.map(view=>shot(view,frame.at)))
      const [original,port]=samples.map(sample=>PNG.sync.read(sample.bytes))
      const diff=new PNG({...dimensions})
      const different=pixelmatch(original.data,port.data,diff.data,dimensions.width,dimensions.height,{threshold:report.threshold})
      const filenames=['react','vue','diff'].map(side=>`${prefix}--${frame.name}--${side}.png`)
      await Promise.all([samples[0].bytes,samples[1].bytes,PNG.sync.write(diff)].map((bytes,index)=>writeFile(new URL(filenames[index],directory),bytes)))
      result.frames.push({...frame,react:filenames[0],vue:filenames[1],diff:filenames[2],changedPixels:different,ratio:different/(dimensions.width*dimensions.height),nativeAnimations:samples.map(sample=>sample.nativeAnimations)})
      if (frame.name==='start') await Promise.all(views.map(view=>performInput(view,result.input)))
      if (frame.name==='mid' && result.input.scenario.kind==='hold') await Promise.all(views.map(view=>view.page.mouse.up()))
      elapsed=frame.at
    }
  } catch (error) {
    result.errors.push(error.message.split('\n')[0])
  } finally { await Promise.all(contexts.map(context=>context.close())) }
  if (result.errors.length) result.status='capture-error'
  return result
}

async function pair(task) {
  let result = await captureAttempt(task)
  if (result.errors.some(error => error.includes('failed to mount') || error.includes('Timeout'))) {
    const previous = result.errors
    result = await captureAttempt(task)
    result.previousAttempt = previous
  }
  const prefix = `${task.entry.slug}--${task.example.slug}--${task.theme}`
  await writeFile(new URL(`${prefix}.json`,directory),JSON.stringify(result,null,2)+'\n')
  report.results.push(result)
  console.log(`${report.results.length}/${tasks.length} ${prefix} ${result.status}${result.errors.length?' '+result.errors[0]:''}`)
}

try {
  await mkdir(directory,{recursive:true})
  await reference.listen()
  let ready=false
  for(let attempt=0;attempt<100;attempt++) {
    if ((await fetch(`http://127.0.0.1:${previewPort}/beui-vue/`).catch(()=>null))?.ok) { ready=true; break }
    await delay(100)
  }
  if (!ready) throw Error('The built docs preview did not start')
  browser=await chromium.launch()
  let cursor=0
  async function worker() {
    while(cursor<tasks.length) await pair(tasks[cursor++])
  }
  await Promise.all(Array.from({length:concurrency},worker))
  report.results.sort((left,right)=>`${left.slug}-${left.variant}-${left.theme}`.localeCompare(`${right.slug}-${right.variant}-${right.theme}`))
  await writeFile(new URL(reportName,directory),JSON.stringify(report,null,2)+'\n')
  await mergeRecapturedCases()
  if (report.results.some(item=>item.status!=='captured')) process.exitCode=1
} finally {
  await browser?.close()
  docs.kill()
  await reference.close()
}
