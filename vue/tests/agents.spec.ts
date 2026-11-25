import { expect, test } from '@playwright/test'
import { exampleFrame, openDemo } from './open-demo'

test('pages with several examples show each one in its own pinned frame', async ({ page }) => {
  await openDemo(page,'agent-activity')
  for (const variant of ['streaming-text','reasoning-steps','web-search','tool-calls','mixed-activity','agent-trace']) {
    const frame = exampleFrame(page, variant)
    await expect(frame.locator('[data-example-variant]')).toHaveAttribute('data-example-variant', variant)
    await expect(frame.getByRole('combobox',{name:'Example'})).toHaveCount(0)
  }
})

test('composer submits on Enter and preserves Shift+Enter and focus', async ({ page }) => {
  await openDemo(page, 'prompt-input')
  const prompt = page.getByRole('textbox', { name: 'Prompt', exact: true })
  await prompt.fill('Document this component')
  await prompt.press('Shift+Enter')
  await expect(prompt).toHaveValue('Document this component\n')
  await prompt.press('Enter')
  await expect(prompt).toBeFocused()
  await expect(page.getByRole('status').filter({ hasText: 'Prompt sent to the selected model.' })).toBeVisible()
})

test('tool approval exposes parameters and reports the user decision', async ({ page }) => {
  await openDemo(page, 'tool-approval')
  const demo = page.locator('.beui-demo')
  await expect(demo.getByRole('button', { name: 'View details' })).toHaveAttribute('aria-expanded', 'true')
  await expect(demo.getByText('bun test tests/a11y.test.tsx')).toBeVisible()
  await expect(demo.getByRole('status')).toHaveText('Approval required')
  await demo.getByRole('button', { name: 'Allow once' }).press('Enter')
  // The decision is announced through the status region as it moves through the approval states.
  await expect(demo.getByRole('status')).toHaveText('Approving')
  await expect(demo.getByRole('status')).toHaveText('Completed', { timeout: 10_000 })
  await expect(demo.getByRole('button', { name: 'Allow once' })).toHaveCount(0)
  await demo.getByRole('button', { name: 'Replay' }).press('Enter')
  await expect(demo.getByRole('status')).toHaveText('Approval required')
  await demo.getByRole('button', { name: 'Deny' }).press('Enter')
  await expect(demo.getByRole('status')).toHaveText('Denied')
})

test('answer feedback can be toggled with the keyboard', async ({ page }) => {
  await openDemo(page, 'streaming-response')
  // The demo replays its stream on mount, which removes the actions until it ends. A key
  // pressed while they fade out is lost, so wait for the replay to finish. The server markup
  // is already complete, so see the replay start first (it never runs with reduced motion).
  const response = page.locator('.beui-demo .sr')
  if (!await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)) {
    await expect(response).toHaveAttribute('aria-busy', 'true')
  }
  await expect(response).toHaveAttribute('aria-busy', 'false', { timeout: 15_000 })
  const helpful = page.getByRole('button', { name: 'Helpful', exact: true })
  await helpful.press('Space')
  await expect(helpful).toHaveAttribute('aria-pressed', 'true')
  await helpful.press('Space')
  await expect(helpful).toHaveAttribute('aria-pressed', 'false')
})

test('resource tree navigation and renaming preserve focus', async ({ page, isMobile }) => {
  await openDemo(page, 'ai-sidebar')
  // On a phone the sidebar is a modal sheet that starts closed; the header trigger opens it.
  if (isMobile) {
    await page.locator('.beui-demo').getByRole('button', { name: 'Toggle sidebar' }).click()
    await expect(page.getByRole('dialog', { name: 'Workspace resources' })).toBeVisible()
  }
  // Each row's name also carries its "Actions for …" menu button, so match on the label prefix.
  const folder = page.getByRole('treeitem', { name: /^Platform/ })
  await expect(folder).toHaveAttribute('aria-expanded', 'true')
  await folder.focus()
  // The folder is open, so ArrowRight steps into its first child and ArrowLeft returns to it.
  const file = page.getByRole('treeitem', { name: /^API migration/ })
  await folder.press('ArrowRight')
  await expect(file).toBeFocused()
  await file.press('ArrowLeft')
  await expect(folder).toBeFocused()
  await folder.press('ArrowDown')
  await expect(file).toBeFocused()
  await file.press('F2')
  await page.getByRole('textbox', { name: 'Rename API migration' }).fill('Migration plan')
  await page.getByRole('textbox', { name: 'Rename API migration' }).press('Enter')
  await expect(page.getByRole('treeitem', { name: /^Migration plan/ })).toBeFocused()
})
