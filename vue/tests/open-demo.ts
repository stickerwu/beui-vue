import type { Page } from '@playwright/test'

export async function openDemo(page: Page, slug: string) {
  await page.goto(`/beui-vue/components/${slug}`)
  await page.locator('.beui-demo[data-ready="true"]').waitFor()
}
