import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'

const {createServer} = await import(new URL('../../node_modules/vite/dist/node/index.js', import.meta.url))
const server = await createServer({configFile:fileURLToPath(new URL('../parity/vite.config.mts', import.meta.url)), logLevel:'warn'})
const output = new URL('../.artifacts/parity/', import.meta.url)
const slugs = ['button-base','tabs','before-after-slider','animated-toast-stack','line-chart','shader-background']
await mkdir(output, {recursive:true})
await server.listen()
let browser
try {
  browser = await chromium.launch()
  const report = []
  for (const slug of slugs) {
    for (const theme of ['light','dark']) {
      const samples = {}
      for (const side of ['react','vue']) {
        const page = await browser.newPage({viewport:{width:640,height:400}, deviceScaleFactor:1, colorScheme:theme})
        const errors = []
        page.on('pageerror', err => errors.push(err.message))
        try {
          await page.clock.install({time:new Date('2026-01-01T12:00:00Z')})
          await page.goto(`http://127.0.0.1:4185/?${new URLSearchParams({side,slug,theme})}`)
          await page.locator('body[data-ready=true]').waitFor({state:'attached',timeout:45000})
          await page.evaluate(() => document.fonts.ready)
          await page.clock.runFor(1500)
          const stage = page.locator('#stage')
          const frames = [await stage.screenshot()]
          if (slug === 'tabs') await page.getByRole('tab', {name:'Activity', exact:true}).click()
          else if (slug === 'button-base') {
            await page.getByRole('button', {name:'Continue'}).hover()
            await page.mouse.down()
          } else if (slug === 'before-after-slider') await page.getByRole('slider').press('End')
          else if (slug === 'line-chart') await page.getByRole('slider').press('Home')
          await page.clock.runFor(80)
          frames.push(await stage.screenshot())
          await page.clock.runFor(700)
          frames.push(await stage.screenshot())
          samples[side] = frames
          if (errors.length) throw Error(errors.join('\n'))
        } catch (error) { throw Error(`${slug} / ${theme} / ${side}: ${error.message}\n${errors.join('\n')}`) }
        finally { await page.close() }
      }
      const differences = []
      for (const [index, stage] of ['start','mid','end'].entries()) {
        const path = `${slug}-${theme}-${stage}`
        const original = PNG.sync.read(samples.react[index])
        const port = PNG.sync.read(samples.vue[index])
        const difference = new PNG({width:original.width, height:original.height})
        const pixels = pixelmatch(original.data, port.data, difference.data, original.width, original.height, {threshold:0.1})
        differences.push(pixels / (original.width * original.height))
        await Promise.all([['react',samples.react[index]],['vue',samples.vue[index]],['diff',PNG.sync.write(difference)]].map(([side, data]) => writeFile(new URL(`${path}-${side}.png`, output), data)))
      }
      report.push({slug,theme,differences})
      await writeFile(new URL('report.json', output), JSON.stringify(report, null, 2))
      console.log(slug,theme,differences.map(ratio => `${(ratio * 100).toFixed(2)}%`).join(' / '))
    }
  }
} finally { await browser?.close(); await server.close() }
