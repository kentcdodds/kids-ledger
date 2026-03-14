import { createKidWithAccount, expect, test } from './playwright-utils.ts'

test('parent can complete first kid/account/transaction flow', async ({
	page,
	login,
}) => {
	await login()
	const { kidName, accountName } = await createKidWithAccount(page)

	await page.goto('/')
	await page.getByRole('button', { name: new RegExp(accountName) }).click()
	await page.getByLabel('Amount').fill('1.00')
	await page.getByRole('button', { name: 'Add' }).last().click()

	await expect(page.getByText('Family Total:')).toContainText('$1.00')

	await page.goto('/history')
	await expect(
		page
			.locator('article strong')
			.filter({ hasText: new RegExp(`${kidName} · ${accountName}`) })
			.first(),
	).toBeVisible()
})

test('transaction modal includes a current total quick amount', async ({
	page,
	login,
}) => {
	await login()
	const { accountName } = await createKidWithAccount(page)

	await page.goto('/')
	const accountButton = page.getByRole('button', {
		name: new RegExp(accountName),
	})

	await accountButton.click()
	await page.getByLabel('Amount').fill('4.25')
	await page.getByRole('button', { name: 'Add' }).last().click()
	await expect(page.getByText('Family Total:')).toContainText('$4.25')

	await accountButton.click()
	const modal = page.getByRole('dialog')
	const currentTotalButton = modal.getByRole('button', {
		name: 'Current Total ($4.25)',
	})

	await expect(currentTotalButton).toBeVisible()
	await expect(currentTotalButton).toBeEnabled()
	await currentTotalButton.click()
	await expect(modal.getByLabel('Amount')).toHaveValue('4.25')
})
