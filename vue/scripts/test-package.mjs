import { execFileSync, spawn } from 'node:child_process'
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const root = fileURLToPath(new URL('../', import.meta.url))
const runner = process.env.npm_execpath
if (!runner) throw Error('Run pnpm test:package')
const nodeScript = /\.[cm]?js$/i.test(runner)
const run = (cwd, ...args) => execFileSync(nodeScript ? process.execPath : runner, nodeScript ? [runner, ...args] : args, {cwd, stdio:'inherit'})
const output = join(root, '.artifacts')
await mkdir(output, {recursive:true})
const work = await mkdtemp(join(tmpdir(), 'beui-consumer-'))
try {
  run(join(root, 'packages/ui'), 'pack', '--pack-destination', work)
  const archive = (await readdir(work)).find(name => name.endsWith('.tgz'))
  if (!archive) throw Error('Missing packed library')
  await cp(join(work, archive), join(output, archive))
  for (const fixture of ['vite', 'nuxt']) {
    const cwd = join(work, fixture)
    await cp(join(root, 'fixtures', fixture), cwd, {recursive:true})
    const manifest = JSON.parse(await readFile(join(cwd, 'package.json'), 'utf8'))
    manifest.dependencies['beui-vue'] = `file:../${archive}`
    await writeFile(join(cwd, 'package.json'), JSON.stringify(manifest, null, 2))
    run(cwd, 'install', '--registry=https://registry.npmjs.org/', '--no-frozen-lockfile')
    run(cwd, 'run', 'build')
    if (fixture === 'nuxt') await checkHydration(cwd)
  }
} finally {
  await rm(work, {recursive:true, force:true, maxRetries:3, retryDelay:1000})
}

async function checkHydration(cwd) {
  const server = spawn(process.execPath, ['.output/server/index.mjs'], {
    cwd, env:{...process.env, NITRO_PORT:'0', NITRO_HOST:'127.0.0.1'}, stdio:['ignore','pipe','inherit'],
  })
  let browser
  const exited = new Promise(resolve => server.once('exit', resolve))
  try {
    const url = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(Error('Nuxt startup timed out')), 30000)
      server.stdout.on('data', chunk => {
        const address = String(chunk).match(/http:\/\/127\.0\.0\.1:\d+/)?.[0]
        if (address) { clearTimeout(timeout); resolve(address) }
      })
      server.once('exit', code => { clearTimeout(timeout); reject(Error(`Nuxt exited: ${code}`)) })
    })
    const response = await fetch(url)
    if (!response.ok || !(await response.text()).includes('Packed count 0')) throw Error('Missing SSR button')
    browser = await chromium.launch()
    const page = await browser.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(String(error)))
    page.on('console', message => { if (/hydration/i.test(message.text())) errors.push(message.text()) })
    await page.goto(url)
    await page.locator('[data-ready="true"] button').click()
    await page.getByRole('button', {name:'Packed count 1'}).waitFor()
    if (errors.length) throw Error(errors.join('\n'))
  } finally {
    await browser?.close()
    server.kill()
    await exited
  }
}
