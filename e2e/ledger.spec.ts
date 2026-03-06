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
