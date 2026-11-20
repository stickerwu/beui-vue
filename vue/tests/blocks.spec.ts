import { expect, test } from '@playwright/test'
import { openDemo } from './open-demo'

test('OTP accepts paste and announces a completed code', async ({ page }) => {
  await openDemo(page, 'otp-input')
  const code = page.getByRole('textbox', { name: 'One-time passcode' })
  await code.fill('246810')
  await expect(page.locator('.beui-demo').getByRole('status').filter({ hasText: 'Verified' })).toBeVisible()
})

test('command palette restores focus after keyboard selection', async ({ page }) => {
  await openDemo(page, 'command-palette')
  const trigger = page.getByRole('button', { name: 'Open command palette' })
  await trigger.press('Enter')
  const input = page.getByRole('combobox', { name: 'Search commands' })
  await input.fill('release')
  await input.press('Enter')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(trigger).toBeFocused()
})

test('uploads expose a keyboard-accessible queue and removal', async ({ page }) => {
  await openDemo(page, 'file-upload')
  const demo = page.locator('.beui-demo')
  await demo.locator('input[type=file]').setInputFiles({ name:'design.txt', mimeType:'text/plain', buffer:Buffer.from('notes') })
  const remove = demo.getByRole('button', { name:'Remove design.txt' })
  await remove.press('Enter')
  await expect(remove).toHaveCount(0)
})

test('error page variants retain actionable navigation', async ({ page }) => {
  await openDemo(page, 'not-found-terminal')
  const demo = page.locator('.beui-demo')
  await expect(demo.getByRole('link', {name:'Back home'})).toHaveAttribute('href', '../')
  await expect(demo.getByRole('link', {name:'Browse components'})).toBeVisible()
})
