import { expect, test } from '@playwright/test'
import { openDemo } from './open-demo'

test('OTP accepts paste and announces a completed code', async ({ page }) => {
  await openDemo(page, 'otp-input')
  const code = page.getByRole('textbox', { name: 'Verification code' })
  await code.fill('246810')
  await expect(code).toHaveAttribute('aria-invalid', 'true')
  await expect(page.locator('.beui-demo').getByRole('status')).toHaveText('Wrong code, try again.')
  await code.fill('123456')
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

test('swap filters by network and token before recalculating the quote', async ({ page }) => {
  await openDemo(page, 'swap')
  const demo = page.locator('.beui-demo')
  await demo.getByRole('button',{name:'Choose receiving token'}).click()
  const picker = demo.getByRole('dialog')
  await picker.getByRole('combobox',{name:'Network'}).selectOption('base')
  await picker.getByRole('searchbox',{name:'Search tokens'}).fill('usdc')
  await picker.getByRole('button',{name:/USDC/}).press('Enter')
  await expect(picker).not.toBeVisible()
  await expect(demo.getByText('1 ETH ≈ 3142 USDC')).toBeVisible()
})

test('prediction market prevents overselling and allows the available shares', async ({ page }) => {
  await openDemo(page, 'prediction-market')
  const demo = page.locator('.beui-demo')
  await demo.getByRole('button',{name:'Sell'}).click()
  await demo.getByRole('spinbutton',{name:'Shares'}).fill('100')
  await expect(demo.getByRole('button',{name:'Not enough shares'})).toBeDisabled()
  await demo.getByRole('button',{name:'Max'}).click()
  await demo.getByRole('button',{name:'Trade',exact:true}).click()
  await expect(demo.getByText('Trade filled')).toBeVisible()
})

test('card dealer moves hand cards to the pile and deals from the deck', async ({ page }) => {
  await openDemo(page, 'card-dealer')
  const demo = page.locator('.beui-demo')
  const hand = demo.locator('[data-zone=hand]')
  await expect(hand).toHaveCount(2)
  await hand.first().press('Enter')
  await expect(demo.locator('[data-zone=pile]')).toHaveCount(1)
  await demo.getByRole('button',{name:'Deal a card'}).click()
  await expect(hand).toHaveCount(2)
})

test('masonry reflows its columns without a ResizeObserver loop', async ({ page }) => {
  const errors:string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await openDemo(page, 'infinite-masonry')
  const gallery = page.locator('.beui-demo .be-masonry')
  await expect(gallery).toBeVisible()
  await gallery.evaluate(element => { element.style.width='310px' })
  await expect(gallery.locator('.be-masonry-cols > div')).toHaveCount(2)
  await gallery.evaluate(element => { element.style.width='200px' })
  await expect(gallery.locator('.be-masonry-cols > div')).toHaveCount(1)
  expect(errors.filter(message => message.includes('ResizeObserver'))).toEqual([])
})
