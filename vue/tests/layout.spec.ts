import { expect, test } from '@playwright/test'
import { openDemo } from './open-demo'

test('drawer traps keyboard focus and restores its trigger', async ({ page }) => {
  await openDemo(page, 'drawer')
  const trigger = page.getByRole('button', { name: 'Open left' })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'Demo drawer' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Close', exact: true }).press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(trigger).toBeFocused()
})

test('lightbox browses images with the keyboard', async ({ page }) => {
  await openDemo(page, 'morphing-lightbox')
  await page.getByRole('button', { name: 'Sculptural architecture' }).click()
  const dialog = page.getByRole('dialog', { name: 'Collected photographs' })
  await dialog.press('ArrowRight')
  await expect(dialog.getByText('02 / A little room to breathe')).toBeVisible()
  await dialog.press('Escape')
  await expect(dialog).not.toBeVisible()
})

test('keyboard reorder can be undone', async ({ page }) => {
  await openDemo(page, 'sortable-stack')
  const list = page.getByRole('list', { name: 'Studio priorities' })
  const handle = list.getByRole('button', { name: 'Reorder Collect references' })
  await handle.press('Space')
  await handle.press('ArrowDown')
  await handle.press('Space')
  await expect(list.getByRole('listitem').first()).toContainText('Explore the visual system')
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(list.getByRole('listitem').first()).toContainText('Collect references')
})

test('file tree navigates visible nodes and collapses branches', async ({ page }) => {
  await openDemo(page, 'file-tree')
  const tree = page.getByRole('tree', { name: 'Project files' })
  const folder = tree.getByRole('treeitem', { name: 'components', exact: true })
  await folder.focus()
  await folder.press('ArrowLeft')
  await expect(folder).toHaveAttribute('aria-expanded', 'false')
  await expect(tree.getByRole('treeitem', { name: 'button.tsx' })).toHaveCount(0)
})

test('an open book follows keyboard browsing and closes with Escape', async ({ page }) => {
  await openDemo(page, 'bookshelf')
  const open = page.getByRole('button', { name: 'Middlemarch by George Eliot' })
  await expect(open).toHaveAttribute('aria-pressed','true')
  await open.press('ArrowRight')
  const next = page.getByRole('button', { name:'Moby-Dick by Herman Melville' })
  await expect(next).toBeFocused()
  await expect(next).toHaveAttribute('aria-pressed','true')
  await next.press('Escape')
  await expect(next).toHaveAttribute('aria-pressed','false')
})

test('local scrolling provider scrolls the reader when reduced motion is enabled', async ({ page }) => {
  await page.emulateMedia({ reducedMotion:'reduce' })
  await openDemo(page,'smooth-scroll')
  await page.getByRole('button',{ name:'Jump to the last section' }).click()
  await expect.poll(() => page.locator('.reader').evaluate(element => element.scrollTop)).toBeGreaterThan(300)
  await page.getByRole('button',{ name:'Back to start' }).click()
  await expect.poll(() => page.locator('.reader').evaluate(element => element.scrollTop)).toBe(0)
})

test('horizontal swiping moves the lightbox on a touch screen', async ({ page, isMobile }) => {
  test.skip(!isMobile)
  await openDemo(page,'morphing-lightbox')
  await page.getByRole('button',{name:'Sculptural architecture'}).tap()
  const dialog = page.getByRole('dialog',{name:'Collected photographs'})
  await dialog.getByRole('img').evaluate(element => {
    const start = new Touch({ identifier:7,target:element,clientX:210,clientY:120 })
    const end = new Touch({ identifier:7,target:element,clientX:78,clientY:124 })
    element.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,touches:[start]}))
    element.dispatchEvent(new TouchEvent('touchend',{bubbles:true,changedTouches:[end]}))
  })
  await expect(dialog.getByText('02 / A little room to breathe')).toBeVisible()
})
