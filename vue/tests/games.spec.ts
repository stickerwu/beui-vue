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
  // The demo draws from Math.random through slideResult: 0.75 lands 3.96x, 0.4 lands 1.65x.
  type Draw = { __draw: number }
  await page.addInitScript(() => { (window as unknown as Draw).__draw = 0.75; Math.random = () => (window as unknown as Draw).__draw })
  await openDemo(page, 'slide-game')
  const game = page.locator('[data-slot="slide-game"]')
  await game.getByRole('button', { name: 'Double bet' }).click()
  await expect(game.getByLabel('Bet amount')).toHaveValue('2.00')
  await game.getByRole('button', { name: 'Slide', exact: true }).click()
  await expect(game.getByRole('status')).toContainText('Landed on 3.96×. Win, target 2×.')
  await expect(page.getByText('+$2.00')).toBeVisible()
  await page.evaluate(() => { (window as unknown as Draw).__draw = 0.4 })
  await page.waitForTimeout(450)
  await game.getByRole('button', { name: 'Slide again' }).click()
  await expect(game.getByRole('status')).toContainText('Landed on 1.65×. Loss, target 2×.')
  await expect(page.getByText('+$0.00')).toBeVisible()
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
  await expect(game.locator('p[aria-live="polite"]')).toContainText('1.14×')
  await expect(game.getByRole('button', { name: 'Play again' })).toBeVisible()
})

test('plinko lands without animation when reduced motion is requested', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openDemo(page, 'plinko')
  const game = page.locator('[data-slot="plinko"]')
  await game.getByRole('button', { name: 'Drop ball' }).click()
  await expect(game.locator('p[aria-live="polite"]')).toContainText('Ball 1 landed in slot')
  await expect(game.getByRole('button', { name: 'Peg flash' })).toHaveCount(0)
})

// Math.random() = 0.5 makes the built-in crash point exactly 2.00x, 5.8s into the flight.
test('balloon pays a cash out and ends the round at the drawn crash point', async ({ page }) => {
  await page.addInitScript(() => { Math.random = () => 0.5 })
  await page.clock.install()
  await openDemo(page, 'crash-balloon')
  const game = page.locator('[data-slot="crash-balloon"]')
  await game.getByRole('button', { name: 'Start', exact: true }).click()
  await page.clock.runFor(600)
  await game.getByRole('button', { name: /^Cash out/ }).click()
  await expect(game.getByRole('status')).toContainText(/Cashed out at 1[.][0-9]{2}×/)
  await expect(page.getByText(/^Best cash out 1[.][0-9]{2}×/)).toBeVisible()
  await page.clock.runFor(7000)
  await expect(game.getByRole('status')).toContainText('Crashed at 2.00×')
  await expect(game.getByRole('button', { name: 'Play again' })).toBeVisible()
})

test('flight, balloon and tower crash at the drawn multiplier', async ({ page }) => {
  await page.addInitScript(() => { Math.random = () => 0.5 })
  await page.clock.install()
  for (const slug of ['crash', 'crash-balloon', 'crash-tower']) {
    await openDemo(page, slug)
    const game = page.locator(`[data-slot="${slug}"]`)
    await game.getByRole('button', { name: 'Start', exact: true }).click()
    // WebKit's fake clock costs about 30ms of real time per animation frame, so stepping all 7s
    // (420 frames) takes ~14s a game. Step the first second frame by frame, then jump the rest:
    // the round advances by the elapsed time, so the crash point is the same.
    await page.clock.runFor(1000)
    await page.clock.fastForward(6000)
    await expect(game.getByRole('status')).toContainText('Crashed at 2.00×')
    await expect(game.getByRole('group', { name: 'Round result' })).toBeVisible()
  }
})

// Real time, since the ticket's exit is an animation: Escape and a tap on the dimmed stage put the result away.
test('the result ticket closes on Escape or a tap outside it and focus stays on the main action', async ({ page }) => {
  test.setTimeout(45000)
  await page.addInitScript(() => { Math.random = () => 0.5 })
  await openDemo(page, 'crash')
  const game = page.locator('[data-slot="crash"]')
  const ticket = game.getByRole('group', { name: 'Round result' })
  await game.getByRole('button', { name: 'Start', exact: true }).click()
  await expect(ticket).toBeVisible({ timeout: 15000 })
  await page.keyboard.press('Escape')
  await expect(ticket).toHaveCount(0)
  await expect(game.getByRole('button', { name: 'Play again' })).toBeFocused()
  await game.getByRole('button', { name: 'Play again' }).click()
  await expect(ticket).toBeVisible({ timeout: 15000 })
  await game.getByRole('button', { name: 'Hide result and show the flight' }).click({ position: { x: 8, y: 8 } })
  await expect(ticket).toHaveCount(0)
})
