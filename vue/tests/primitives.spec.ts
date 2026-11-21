import { expect, test } from '@playwright/test'
import { openDemo } from './open-demo'

test('aspect ratios keep the image alternative and expose the selected crop', async ({ page }) => {
  await openDemo(page, 'aspect-ratio')
  const choice = page.getByRole('tab', { name: '1:1', exact: true })
  await choice.click()
  await expect(choice).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('img', { name: 'A lakeside cabin beneath mountains, reflected in the water' })).toBeVisible()
})

test('urgent alerts announce changes and restore focus after dismissal', async ({ page }) => {
  await openDemo(page, 'alert')
  await page.getByRole('tab', { name: 'Error', exact: true }).click()
  const alert = page.getByRole('alert').filter({ hasText: 'Something went wrong' })
  await alert.getByRole('button', { name: 'Dismiss alert' }).press('Enter')
  await expect(alert).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Show alert' })).toBeFocused()
})

test('cards preserve heading semantics and a single choice control', async ({ page }) => {
  await openDemo(page, 'card')
  await expect(page.getByRole('heading', { name: 'Review order' })).toBeVisible()
  const choice = page.getByRole('checkbox', { name: 'Signed contract' })
  await choice.focus()
  await choice.press('Space')
  await expect(choice).not.toBeChecked()
})

test('collapsible names its region, then restores focus on an internal close', async ({ page }) => {
  await openDemo(page, 'collapsible')
  const trigger = page.getByRole('button', { name: 'More details' })
  await trigger.press('Space')
  const region = page.getByRole('region', { name: 'More details' })
  await expect(region).toHaveAttribute('id', (await trigger.getAttribute('aria-controls'))!)
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  await expect(region).toContainText('Keep extra information tucked away')
  // The demo content has nothing focusable, so add a control the way an app would
  // (an internal "close" action) and make sure focus is not stranded when it closes the region.
  await region.evaluate((node, triggerName) => {
    const close = document.createElement('button')
    close.type = 'button'
    close.textContent = 'Close details'
    close.addEventListener('click', () => {
      for (const button of document.querySelectorAll('button')) if (button.textContent?.includes(triggerName)) button.click()
    })
    node.firstElementChild!.append(close)
  }, 'More details')
  const close = region.getByRole('button', { name: 'Close details' })
  await close.focus()
  await close.press('Enter')
  await expect(trigger).toBeFocused()
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await expect(region).toHaveCount(0)
})

test('switch exposes checked state, keyboard activation and disabled semantics', async ({ page }) => {
  await openDemo(page, 'switch')
  const notifications = page.getByRole('switch', { name: 'Enable notifications' })
  await expect(notifications).toBeChecked()
  await notifications.press('Space')
  await expect(notifications).not.toBeChecked()
  await expect(page.getByRole('switch', { name: 'Disabled' })).toBeDisabled()
})
