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
  // The drum is a listbox; with reduced motion it becomes a plain list of buttons (see the next test).
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await openDemo(page, 'wheel-picker')
  await page.getByRole('listbox', {name:'Month'}).press('End')
  await expect(page.getByRole('option',{name:'December'})).toHaveAttribute('aria-selected','true')
  await expect(page.locator('.beui-demo .born')).toHaveText('December 9, 2004')
})

test('wheel picker with reduced motion is a labelled list of buttons that marks and syncs the selection', async ({page}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openDemo(page, 'wheel-picker')
  const month = page.getByRole('list', {name:'Month'})
  await expect(month.getByRole('button', {name:'June', exact:true})).toHaveAttribute('aria-current', 'true')
  const december = month.getByRole('button', {name:'December', exact:true})
  await december.focus()
  await december.press('Enter')
  await expect(december).toHaveAttribute('aria-current', 'true')
  await expect(month.getByRole('button', {name:'June', exact:true})).not.toHaveAttribute('aria-current', 'true')
  await expect(page.locator('.beui-demo .born')).toHaveText('December 9, 2004')
})
