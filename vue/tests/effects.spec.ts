import { expect, test } from '@playwright/test'
import { openDemo } from './open-demo'

test('scramble resolves the latest phrase when interrupted', async ({ page }) => {
  await openDemo(page, 'text-scramble')
  const next = page.getByRole('button', { name: 'Next phrase' })
  await next.click()
  await next.click()
  await expect(page.locator('[data-scramble-output]')).toHaveText('Preparing the update')
})

test('marquee pauses accessibly and only exposes the original track', async ({ page }) => {
  await openDemo(page, 'marquee')
  await page.getByRole('button', { name: 'Pause marquee' }).click()
  const original = page.locator('[data-marquee-track]').first()
  await expect(original).toHaveCSS('animation-play-state', 'paused')
  await expect(page.locator('[data-marquee-track]').last()).toHaveAttribute('aria-hidden', 'true')
  await page.getByRole('button', { name: 'Play marquee' }).click()
  await expect(page.getByRole('button', { name: 'Pause marquee' })).toBeVisible()
})

test('scroll-to moves the inner scroller and honors offsets', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openDemo(page, 'scroll-to')
  const region = page.getByRole('region', { name: 'Scroll to section' })
  await region.getByRole('button', { name: 'Pricing' }).click()
  await expect.poll(() => region.evaluate(element => Math.round(element.scrollTop))).toBeGreaterThan(420)
  const distance = await region.evaluate(element => element.querySelector('[data-pricing]')!.getBoundingClientRect().top - element.getBoundingClientRect().top)
  expect(Math.abs(distance - 48)).toBeLessThan(3)
})

test('contained progress runs from zero to full in reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openDemo(page, 'scroll-progress')
  const region = page.getByRole('region', { name: 'Sections' })
  const bar = page.getByTestId('progress-bar')
  await region.evaluate(element => { element.scrollTop = element.scrollHeight })
  await expect.poll(() => bar.evaluate(element => new DOMMatrix(getComputedStyle(element).transform).a)).toBeGreaterThan(.99)
  await region.evaluate(element => { element.scrollTop = 0 })
  await expect.poll(() => bar.evaluate(element => new DOMMatrix(getComputedStyle(element).transform).a)).toBeLessThan(.01)
})
