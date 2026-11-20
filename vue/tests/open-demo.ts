import type { Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { componentRoutes } from '../scripts/routes.mjs'

const {paths} = componentRoutes(JSON.parse(readFileSync(new URL('../catalog.json', import.meta.url), 'utf8')).entries)
export function demoPath(slug: string): string {
  const address = new URL(slug, 'http://localhost')
  const path = paths.get(address.pathname.slice(1))
  if (!path) throw Error(`Unknown demo: ${slug}`)
  return path + address.search + address.hash
}

export async function openDemo(page: Page, slug: string) {
  await page.goto(demoPath(slug), {waitUntil:'domcontentloaded'})
  await page.locator('.beui-demo[data-ready="true"]').waitFor()
}
