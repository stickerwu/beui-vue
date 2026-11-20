import { expect, test } from '@playwright/test'
import { openDemo } from './open-demo'
import { crashPoint, minesMultiplier, plinkoSlots, slideResult } from '../packages/ui/src/games/game-math'

test('injected draws reproduce the upstream payouts', () => {
  expect(crashPoint(() => .5)).toBe(2)
  expect(slideResult(() => .5)).toBe(1.98)
  expect(crashPoint(() => 1)).toBe(1_000_000)
  expect(minesMultiplier(25, 3, 2)).toBeCloseTo(25 * 24 / (22 * 21), 12)
  expect(plinkoSlots(4, { center: 1, edge: 100 })).toEqual([100, 10, 1, 10, 100])
})

test('slide settles against the selected target and locked stake', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openDemo(page, 'slide-game')
  const game = page.locator('[data-slot="slide-game"]')
  await game.getByRole('button', { name: 'Double bet' }).click()
  await expect(game.getByLabel('Bet amount')).toHaveValue('10')
  await game.getByRole('button', { name: 'Slide', exact: true }).click()
  await expect(game.getByRole('status')).toContainText('Won target 2.00')
  await expect(page.getByText('10 credits · 2.64× won')).toBeVisible()
  await game.getByRole('button', { name: 'Slide', exact: true }).click()
  await expect(game.getByRole('status')).toContainText('Missed target')
})

test('a hidden gem is keyboard reachable and cashes out only once', async ({ page }) => {
  await openDemo(page, 'mines')
  const game = page.locator('[data-slot="mines"]')
  await game.getByRole('button', { name: 'Start' }).click()
  await expect(game.getByRole('button', { name: 'Cash out' })).toBeDisabled()
  const first = game.getByRole('button', { name: 'Row 1, column 1, hidden' })
  await first.focus()
  await first.press('ArrowRight')
  const next = game.getByRole('button', { name: 'Row 1, column 2, hidden' })
  await expect(next).toBeFocused()
  await next.press('Enter')
  await game.getByRole('button', { name: 'Cash out' }).click()
  await expect(game.getByRole('status')).toContainText('1.14×')
  await expect(game.getByRole('button', { name: 'Play again' })).toBeVisible()
})

test('plinko lands without animation when reduced motion is requested', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openDemo(page, 'plinko')
  const game = page.locator('[data-slot="plinko"]')
  await game.getByRole('button', { name: 'Drop ball' }).click()
  await expect(game.getByRole('status')).toContainText('Ball 1 landed in slot')
  await expect(game.getByRole('button', { name: 'Peg flash' })).toHaveCount(0)
})

test('live balloon confirms a held cash-out only after the matching reveal', async ({ page }) => {
  await page.clock.install()
  await openDemo(page, 'crash-balloon')
  const game = page.locator('[data-slot="crash-balloon"]')
  await game.getByRole('button', { name: 'Start', exact: true }).click()
  await page.clock.runFor(400)
  await game.getByRole('button', { name: 'Cash out', exact: true }).click()
  await expect(page.getByText('Waiting for reveal', { exact: true })).toBeVisible()
  await page.clock.runFor(2300)
  await expect(page.getByText(/^Confirmed \d/)).toBeVisible()
  await expect(game.getByRole('status')).toContainText('Crashed at 1.27×')
})

test('flight and tower settle their supplied round multipliers', async ({ page }) => {
  await page.clock.install()
  for (const [slug, point] of [['crash', '1.52'], ['crash-tower', '1.12']]) {
    await openDemo(page, slug)
    const game = page.locator(`[data-slot="${slug}"]`)
    await game.getByRole('button', { name: 'Start', exact: true }).click()
    await page.clock.runFor(3800)
    await expect(game.getByRole('status')).toContainText(`Crashed at ${point}×`)
    if (slug === 'crash') await expect(page.getByText('Ended at 1.52× · cashed at 1.50×')).toBeVisible()
  }
})
