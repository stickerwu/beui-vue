import { expect, test } from '@playwright/test'
import { openDemo } from './open-demo'

test('composer submits on Enter and preserves Shift+Enter and focus', async ({ page }) => {
  await openDemo(page, 'prompt-input')
  const prompt = page.getByRole('textbox', { name: 'Prompt', exact: true })
  await prompt.fill('Document this component')
  await prompt.press('Shift+Enter')
  await expect(prompt).toHaveValue('Document this component\n')
  await prompt.press('Enter')
  await expect(prompt).toBeFocused()
  await expect(page.getByRole('status').filter({ hasText: 'Document this component' })).toBeVisible()
})

test('tool approval exposes parameters and reports the user decision', async ({ page }) => {
  await openDemo(page, 'tool-approval')
  const demo = page.locator('.beui-demo')
  await demo.getByRole('button', { name: 'Allow once' }).press('Enter')
  await expect(demo.getByRole('status')).toContainText('Approved')
})

test('answer feedback can be toggled with the keyboard', async ({ page }) => {
  await openDemo(page, 'streaming-response')
  const helpful = page.getByRole('button', { name: 'Helpful', exact: true })
  await helpful.press('Space')
  await expect(helpful).toHaveAttribute('aria-pressed', 'true')
  await helpful.press('Space')
  await expect(helpful).toHaveAttribute('aria-pressed', 'false')
})

test('resource tree navigation and renaming preserve focus', async ({ page }) => {
  await openDemo(page, 'ai-sidebar')
  const folder = page.getByRole('treeitem', { name: 'Workspace', exact: true })
  await folder.focus()
  await folder.press('ArrowRight')
  const file = page.getByRole('treeitem', { name: 'Design notes', exact: true })
  await folder.press('ArrowDown')
  await expect(file).toBeFocused()
  await file.press('F2')
  await page.getByRole('textbox', { name: 'Rename Design notes' }).fill('Release notes')
  await page.getByRole('textbox', { name: 'Rename Design notes' }).press('Enter')
  await expect(page.getByRole('treeitem', { name: 'Release notes', exact: true })).toBeFocused()
})
