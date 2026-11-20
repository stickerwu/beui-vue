import { expect, test } from '@playwright/test'
import { readFileSync, readdirSync } from 'node:fs'
import { demoPath, openDemo } from './open-demo'

const manifests = readdirSync('.').filter(file => /^ports(?:-[a-z-]+)?\.json$/.test(file))
const slugs = manifests.flatMap(file => Object.keys(JSON.parse(readFileSync(file, 'utf8')))).sort()

for (let start = 0; start < slugs.length; start += 10) {
  const group = slugs.slice(start, start + 10)
  test(`SSR and hydration: ${group[0]} through ${group.at(-1)}`, async ({page}) => {
    test.setTimeout(160000)
    const failures: string[] = []
    let slug = ''
    page.on('pageerror', error => failures.push(`${slug}: ${error.message}`))
    page.on('console', message => {
      if (/hydration.*mismatch/i.test(message.text())) failures.push(`${slug}: ${message.text()}`)
    })
    for (slug of group) {
      await test.step(slug, async () => {
        const address = demoPath(slug)
        const response = await page.request.get(address)
        expect(response.ok()).toBe(true)
        expect(await response.text()).toMatch(/class="beui-demo" data-ready="false"/)
        await openDemo(page, slug)
        const demo = page.locator('.beui-demo')
        expect(await demo.locator(':scope > *').count()).toBeGreaterThan(0)
      })
    }
    expect(failures).toEqual([])
  })
}
