import { expect, test } from '@playwright/test'
import { openDemo } from './open-demo'

test('holding requires a full uninterrupted keyboard press', async ({page}) => {
  await openDemo(page, 'hold-action-button')
  const button = page.getByRole('button', {name:'Hold to confirm'})
  await button.focus()
  await page.keyboard.press('Space')
  await expect(page.locator('.beui-demo output')).toHaveText('Confirmed 0')
  await page.keyboard.down('Space')
  await expect(page.locator('.beui-demo output')).toHaveText('Confirmed 1')
  await page.keyboard.up('Space')
})

test('a rolling swap cycles without moving keyboard focus', async ({page}) => {
  await openDemo(page, 'action-swap-roll')
  const button = page.locator('.beui-demo button')
  await button.press('Enter')
  await expect(button).toHaveAccessibleName('Pause')
  await button.press('Enter')
  await expect(button).toHaveAccessibleName('Play')
})
