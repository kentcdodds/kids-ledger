import AxeBuilder from '@axe-core/playwright'
import { expect, test } from './playwright-utils.ts'

test('transaction modal is keyboard accessible and passes axe', async ({
	page,
	login,
}) => {
	const kidName = `Kid-${crypto.randomUUID().slice(0, 6)}`
	const accountName = `Spending-${crypto.randomUUID().slice(0, 6)}`
	await login()
	await page.goto('/settings')
	await page.getByPlaceholder('Kid name').fill(kidName)
	await page.getByRole('button', { name: 'Add' }).first().click()

	const kidNameInput = page.getByRole('textbox', { name: `${kidName} name` })
	await expect(kidNameInput).toBeVisible()
	const kidCard = page.locator('article').filter({ has: kidNameInput }).first()
	await kidCard.getByPlaceholder('New account name').fill(accountName)
	await kidCard.getByRole('button', { name: 'Add account' }).click()
	await expect(
		kidCard.getByRole('textbox', { name: `${accountName} name` }),
	).toHaveValue(accountName)

	await page.goto('/')
	const accountButton = page.getByRole('button', {
		name: new RegExp(accountName),
	})
	await expect(accountButton).toBeVisible()
	await accountButton.click()

	const modal = page.getByRole('dialog')
	const closeButton = modal.getByRole('button', { name: 'Close' })
	await expect(modal).toBeVisible()
	await expect(closeButton).toBeFocused()
	await page.waitForTimeout(500) // Wait for modal animation to finish

	const accessibilityScanResults = await new AxeBuilder({ page })
		.include('[role="dialog"]')
		.analyze()

	expect(accessibilityScanResults.violations).toEqual([])

	await page.keyboard.press('Shift+Tab')
	await expect(modal.getByRole('button', { name: 'Remove' })).toBeFocused()

	await page.keyboard.press('Tab')
	await expect(closeButton).toBeFocused()

	await page.keyboard.press('Escape')
	await expect(modal).toBeHidden()
	await expect(accountButton).toBeFocused()

	// Test clicking outside closes modal
	await accountButton.click()
	await expect(modal).toBeVisible()

	// Click outside the modal dialog (on the backdrop)
	await page.mouse.click(10, 10)
	await expect(modal).toBeHidden()
	await expect(accountButton).toBeFocused()
})
