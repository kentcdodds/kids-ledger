import { expect, test } from './playwright-utils.ts'

test('parent can complete first kid/account/transaction flow', async ({
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
