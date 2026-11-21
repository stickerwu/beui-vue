import { expect, test } from '@playwright/test'
import { openDemo } from './open-demo'

test('OTP accepts paste and announces a completed code', async ({ page }) => {
  await openDemo(page, 'otp-input')
  const code = page.getByRole('textbox', { name: 'Verification code' })
  await code.fill('246810')
  await expect(code).toHaveAttribute('aria-invalid', 'true')
  await expect(page.locator('.beui-demo').getByRole('status')).toHaveText('Wrong code, try again.')
  // `complete` fires on the empty-to-full transition only, so clear the rejected code first.
  for (let index = 0; index < 6; index++) await code.press('Backspace')
  await expect(page.locator('.beui-demo').getByRole('status')).toHaveText('Enter 123456 to verify.')
  await code.fill('123456')
  await expect(page.locator('.beui-demo').getByRole('status').filter({ hasText: 'Verified' })).toBeVisible()
})

test('command palette restores focus after keyboard selection', async ({ page }) => {
  await openDemo(page, 'command-palette')
  const trigger = page.getByRole('button', { name: 'Open command palette' })
  await trigger.press('Enter')
  const input = page.getByRole('combobox', { name: 'Command palette' })
  await input.fill('profile')
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
  await demo.getByRole('button',{name:'SOL',exact:true}).click()
  const picker = demo.getByRole('dialog',{name:'Select to token'})
  const base = picker.getByRole('button',{name:'Base',exact:true})
  await base.click()
  await expect(base).toHaveAttribute('aria-pressed','true')
  await expect(picker.getByRole('button',{name:'All',exact:true})).toHaveAttribute('aria-pressed','false')
  await picker.getByRole('textbox',{name:'Search name or paste address'}).fill('usdc')
  const usdc = picker.getByRole('button',{name:/^USD Coin USDC/})
  await expect(usdc).toHaveCount(1)
  await usdc.focus()
  await usdc.press('Enter')
  await expect(picker).not.toBeVisible()
  await expect(demo.getByRole('button',{name:'USDC',exact:true})).toBeVisible()
  await expect(demo.getByText('1 ETH ≈ 3,142 USDC')).toBeVisible()
})

test('prediction market prevents overselling and allows the available shares', async ({ page }) => {
  await openDemo(page, 'prediction-market')
  const demo = page.locator('.beui-demo')
  await demo.getByRole('tab',{name:'Sell'}).click()
  await demo.getByRole('textbox',{name:'Shares'}).fill('200')
  // The action stays focusable but reports the problem as its name and refuses to place the order.
  const rejected = demo.getByRole('button',{name:'Not enough shares'})
  await expect(rejected).toBeVisible()
  await rejected.click()
  await expect(demo.getByRole('button',{name:'Trade filled'})).toHaveCount(0)
  await demo.getByRole('button',{name:'Max'}).click()
  await expect(demo.getByRole('textbox',{name:'Shares'})).toHaveValue('125')
  await demo.getByRole('button',{name:'Trade',exact:true}).click()
  await expect(demo.getByRole('button',{name:'Trade filled'})).toBeVisible()
})

test('card dealer moves hand cards to the pile and deals from the deck', async ({ page }) => {
  await openDemo(page, 'card-dealer')
  const demo = page.locator('.beui-demo')
  const hand = demo.locator('[data-zone=hand]')
  await expect(hand).toHaveCount(5)
  await expect(demo.locator('[data-zone=pile]')).toHaveCount(0)
  const first = hand.first().getByRole('button')
  const name = await first.getAttribute('aria-label')
  await first.focus()
  await first.press('Enter')
  await expect(demo.locator('[data-zone=pile]')).toHaveCount(1)
  await expect(hand).toHaveCount(4)
  await expect(demo.getByRole('button',{name:name!,exact:true})).toHaveCount(0)
  await demo.getByRole('button',{name:'Deal',exact:true}).click()
  await expect(hand).toHaveCount(5)
  await demo.getByRole('button',{name:'Deal 3'}).click()
  await expect(hand).toHaveCount(8)
})

test('masonry reflows its columns without a ResizeObserver loop', async ({ page }) => {
  const errors:string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await openDemo(page, 'infinite-masonry')
  const gallery = page.locator('.beui-demo .be-masonry')
  await expect(gallery).toBeVisible()
  // A column needs 208px plus a 12px gap, and the frame takes 26px for its border and padding.
  // Start narrow so every step is a real change, whatever width the viewport gives the demo.
  const lanes = gallery.locator('.be-masonry-cols > div')
  await gallery.evaluate(element => { element.style.width='200px' })
  await expect(lanes).toHaveCount(1)
  await gallery.evaluate(element => { element.style.width='520px' })
  await expect(lanes).toHaveCount(2)
  await gallery.evaluate(element => { element.style.width='200px' })
  await expect(lanes).toHaveCount(1)
  expect(errors.filter(message => message.includes('ResizeObserver'))).toEqual([])
})
