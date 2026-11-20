import { expect, test } from '@playwright/test'
import { openDemo } from './open-demo'

test('description examples deep-link to labeled native inputs', async ({page}) => {
  await openDemo(page,'checkbox?variant=description')
  const comments = page.getByRole('checkbox',{name:'Comments',exact:true})
  await expect(comments).toHaveAccessibleDescription('Replies on threads you started.')
  await comments.press('Space')
  await expect(comments).not.toBeChecked()
  await openDemo(page,'radio?variant=description')
  const schedule = page.getByRole('radio',{name:'Run once',exact:true})
  await expect(schedule).toHaveAccessibleDescription('Runs a single time, right now.')
  await schedule.press('ArrowDown')
  await expect(page.getByRole('radio',{name:'Run on a schedule',exact:true})).toBeChecked()
})

test('toolbar tooltip buttons have labels, toggle state and keyboard navigation', async ({page}) => {
  await openDemo(page,'tooltip?variant=toolbar')
  const toolbar = page.getByRole('toolbar',{name:'Text formatting'})
  const bold = toolbar.getByRole('button',{name:'Bold',exact:true})
  await expect(bold).toHaveAttribute('aria-pressed','true')
  await bold.press('Space')
  await expect(bold).toHaveAttribute('aria-pressed','false')
  await expect(toolbar.getByRole('button',{name:'Insert link'})).toBeDisabled()
  await bold.press('ArrowRight')
  const italic = toolbar.getByRole('button',{name:'Italic'})
  await expect(italic).toBeFocused()
  await expect(page.getByRole('tooltip')).toContainText('Italic')
  await italic.press('Escape')
  await expect(page.getByRole('tooltip')).not.toBeVisible()
})

test('input associates validation details and supports password visibility', async ({ page }) => {
  await openDemo(page, 'input')
  const email = page.getByRole('textbox', { name: 'Email', exact: true })
  await email.fill('invalid')
  await expect(email).toHaveAttribute('aria-invalid', 'true')
  await expect(email).toHaveAccessibleDescription('Enter a valid email address.')
  await email.fill('name@example.org')
  await expect(email).not.toHaveAttribute('aria-invalid', 'true')
  await page.getByRole('button', { name: 'Show password' }).click()
  await expect(page.getByRole('textbox', { name: 'Password', exact: true })).toBeVisible()
})

test('single and multiple choices preserve native keyboard input', async ({ page }) => {
  await openDemo(page, 'radio')
  const pro = page.getByRole('radio', { name: 'Pro, $12/mo' })
  await pro.press('ArrowDown')
  await expect(page.getByRole('radio', { name: 'Team, $29/mo' })).toBeChecked()
  await openDemo(page, 'checkbox')
  const updates = page.getByRole('checkbox', { name: 'Email me product updates' })
  await updates.press('Space')
  await expect(updates).toBeChecked()
})

test('searchable choices filter and commit via keyboard', async ({ page }) => {
  await openDemo(page, 'combobox')
  const search = page.getByRole('combobox', { name: 'Search workspaces' })
  await search.fill('archive')
  await expect(page.getByRole('option')).toHaveCount(1)
  await search.press('Enter')
  await expect(search).toHaveValue('Component archive')
  await expect(search).toHaveAttribute('aria-expanded', 'false')
})

test('pagination updates the visible page window', async ({ page }) => {
  await openDemo(page, 'pagination')
  const nav = page.getByRole('navigation', { name: 'Pagination' })
  await nav.getByRole('button', { name: 'Next page' }).click()
  await expect(nav.getByRole('button', { name: 'Page 7', exact: true })).toHaveAttribute('aria-current', 'page')
})
