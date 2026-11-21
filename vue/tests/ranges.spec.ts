import { expect, test } from '@playwright/test'
import { openDemo } from './open-demo'

test('range accepts step increments and both endpoints', async ({page}) => {
  await openDemo(page, 'range-slider')
  const slider = page.getByRole('slider', {name:'Value'})
  await expect(slider).toHaveAttribute('aria-valuenow', '40')
  await slider.press('ArrowRight')
  await expect(slider).toHaveAttribute('aria-valuenow', '45')
  await expect(page.locator('.beui-demo .readout')).toHaveText('45')
  await slider.press('End')
  await expect(slider).toHaveAttribute('aria-valuenow', '100')
  await slider.press('Home')
  await expect(slider).toHaveAttribute('aria-valuenow', '0')
})

test('wheel picker keeps the selected option in sync with the model', async ({page}) => {
  await openDemo(page, 'wheel-picker')
  await page.getByRole('listbox', {name:'Month'}).press('End')
  await expect(page.getByRole('option',{name:'December'})).toHaveAttribute('aria-selected','true')
  await expect(page.locator('.beui-demo .born')).toHaveText('December 9, 2004')
})
