import { execFileSync, spawn } from 'node:child_process'
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, expect } from '@playwright/test'
import { createRequire } from 'node:module'

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
    await checkConsumer(fixture, cwd)
  }
} finally {
  await rm(work, {recursive:true, force:true, maxRetries:3, retryDelay:1000})
}

async function checkConsumer(fixture, cwd) {
  const args = fixture === 'nuxt'
    ? ['.output/server/index.mjs']
    : [join(cwd, 'node_modules/vite/bin/vite.js'), 'preview', '--host', '127.0.0.1', '--port', '0']
  const server = spawn(process.execPath, args, {
    cwd,
    env: { ...process.env, NITRO_PORT: '0', NITRO_HOST: '127.0.0.1', NO_COLOR: '1' },
    stdio: ['ignore', 'pipe', 'inherit'],
  })
  let browser
  const exited = new Promise(resolve => server.once('exit', resolve))
  try {
    const url = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(Error(`${fixture} startup timed out`)), 30000)
      server.stdout.on('data', chunk => {
        const address = String(chunk).match(/http:\/\/127\.0\.0\.1:\d+/)?.[0]
        if (address) { clearTimeout(timeout); resolve(address) }
      })
      server.once('exit', code => { clearTimeout(timeout); reject(Error(`${fixture} exited: ${code}`)) })
    })
    browser = await chromium.launch()
    if (fixture === 'nuxt') {
      const serverPage = await browser.newPage({ javaScriptEnabled: false })
      await serverPage.goto(url)
      await expect(serverPage.locator('main')).toHaveAttribute('data-ready', 'false')
      await expect(serverPage.getByRole('button', { name: 'Packed count 0' })).toBeVisible()
      await expect(serverPage.getByRole('tabpanel')).toHaveText('Consumer overview')
      await expect(serverPage.getByRole('checkbox', { name: 'Email updates' })).toHaveAccessibleDescription('Receive a weekly summary.')
      await serverPage.close()
    }
    const page = await browser.newPage({ reducedMotion: 'reduce' })
    const errors = []
    page.on('pageerror', error => errors.push(String(error)))
    page.on('console', message => {
      if (message.type() === 'error' || /hydration.*mismatch/i.test(message.text())) errors.push(message.text())
    })
    await page.goto(url)
    await expect(page.locator('main')).toHaveAttribute('data-ready', 'true')
    const count = page.getByRole('button', { name: 'Packed count 0' })
    await expect(count).toHaveCSS('display', 'inline-flex')
    await expect(count).toHaveCSS('border-top-left-radius', '999px')
    await count.click()
    await expect(page.getByRole('button', { name: 'Packed count 1' })).toBeVisible()
    await page.getByRole('tab', { name: 'Overview' }).press('ArrowRight')
    await expect(page.getByRole('tab', { name: 'Activity' })).toBeFocused()
    await expect(page.getByRole('tabpanel')).toHaveText('Recent activity')
    await expect(page.getByLabel('Selected tab')).toHaveText('activity')
    if (fixture === 'vite') {
      const chart = page.getByRole('region', { name: 'Orders by month' })
      await expect(chart).toHaveCSS('position', 'relative')
      await expect(chart.getByRole('row', { name: 'February 5' })).toHaveCount(1)
      const comparison = page.getByRole('slider', { name: 'Before and after comparison' })
      await comparison.press('End')
      await expect(comparison).toHaveAttribute('aria-valuenow', '100')
      await expect(page.getByLabel('Comparison percent')).toHaveText('100')
    } else {
      const checkbox = page.getByRole('checkbox', { name: 'Email updates' })
      await checkbox.press('Space')
      await expect(checkbox).toBeChecked()
      await expect(page.getByLabel('Notification preference')).toHaveText('Enabled')
      await page.getByRole('button', { name: 'Open details' }).click()
      const drawer = page.getByRole('dialog', { name: 'Account details' })
      await expect(drawer).toBeVisible()
      await expect(drawer).toHaveCSS('position', 'fixed')
      await drawer.getByRole('button', { name: 'Close details' }).press('Escape')
      await expect(drawer).not.toBeVisible()
      await expect(page.getByRole('button', { name: 'Open details' })).toBeFocused()
    }
    expect(errors, `${fixture} runtime and hydration diagnostics`).toEqual([])
    const consumerRequire = createRequire(join(cwd, 'package.json'))
    console.log(`${fixture} consumer passed with Vue ${consumerRequire('vue/package.json').version}`)
  } finally {
    await browser?.close()
    server.kill()
    await exited
  }
}
