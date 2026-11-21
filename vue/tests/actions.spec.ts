import { expect, test } from '@playwright/test'
import { openDemo } from './open-demo'

test('holding requires a full uninterrupted keyboard press', async ({page}) => {
  await openDemo(page, 'hold-action-button')
  const button = page.getByRole('button', {name:'Hold for vertical fill'})
  const status = page.locator('.beui-demo p[aria-live="polite"]')
  await button.focus()
  // A tap is not a hold: releasing early cancels, and nothing is confirmed.
  await page.keyboard.press('Space')
  await page.waitForTimeout(300)
  await expect(status).toHaveText('Release early to cancel')
  await page.keyboard.down('Space')
  await page.waitForTimeout(600)
  await page.keyboard.up('Space')
  await page.waitForTimeout(1500)
  await expect(status).toHaveText('Release early to cancel')
  // Holding the key for the full duration confirms, and focus stays on the button.
  await page.keyboard.down('Space')
  await expect(status).toHaveText('Action confirmed')
  await expect(button).toBeFocused()
  await page.keyboard.up('Space')
})

test('a rolling swap cycles without moving keyboard focus', async ({page}) => {
  await openDemo(page, 'action-swap-roll')
  const cycles = [
    {first: 'Save', second: 'Saved'},
    {first: 'Use light theme', second: 'Use dark theme'},
    {first: 'Send invite', second: 'Invite sent'},
  ]
  for (const {first, second} of cycles) {
    const button = page.getByRole('button', {name: first})
    await button.focus()
    await button.press('Enter')
    const swapped = page.getByRole('button', {name: second})
    await expect(swapped).toBeFocused()
    await swapped.press('Enter')
    await expect(page.getByRole('button', {name: first})).toBeFocused()
  }
})
