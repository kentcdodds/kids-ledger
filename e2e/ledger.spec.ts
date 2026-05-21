import {
	addAccountToKidCard,
	createKidWithAccount,
	expect,
	test,
} from './playwright-utils.ts'

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

test('home shows monthly interest preview for accounts with APY', async ({
	page,
	login,
}) => {
	await login()
	const accountName = `Savings-${crypto.randomUUID().slice(0, 6)}`
	await createKidWithAccount(page, {
		accountName,
		accountApyPercent: '12',
	})

	await page.goto('/')
	const accountButton = page.getByRole('button', {
		name: new RegExp(accountName),
	})
	await accountButton.click()
	await page.getByLabel('Amount').fill('30.00')
	await page.getByRole('button', { name: 'Add' }).last().click()

	await expect(accountButton).toContainText('12% APY')
	await expect(accountButton).toContainText('estimated payout $0.28')
	await expect(accountButton).toContainText(/on [A-Z][a-z]{2} \d{1,2}/)
})

test('parent can transfer money between same-kid and cross-kid accounts', async ({
	page,
	login,
}) => {
	await login()
	const kidName = `Kid-${crypto.randomUUID().slice(0, 6)}`
	const accountName = `Spending-${crypto.randomUUID().slice(0, 6)}`
	const { kidCard } = await createKidWithAccount(page, {
		kidName,
		accountName,
	})
	const savingsName = await addAccountToKidCard(kidCard, {
		accountName: `Savings-${crypto.randomUUID().slice(0, 6)}`,
	})
	const otherAccountName = `Giving-${crypto.randomUUID().slice(0, 6)}`
	await createKidWithAccount(page, {
		kidName: `Other-${crypto.randomUUID().slice(0, 6)}`,
		accountName: otherAccountName,
	})

	await page.goto('/')
	await page.getByRole('button', { name: new RegExp(accountName) }).click()
	await page.getByLabel('Amount').fill('12.00')
	await page.getByRole('button', { name: 'Add' }).last().click()
	await expect(page.getByText('Family Total:')).toContainText('$12.00')

	await page.getByRole('button', { name: 'Transfer money' }).click()
	const modal = page.getByRole('dialog', { name: 'Transfer money' })
	await expect(
		modal.getByLabel('From account').locator('option:checked'),
	).toContainText(accountName)
	await expect(
		modal.getByLabel('To account').locator('option:checked'),
	).toContainText(savingsName)
	await expect(
		modal.getByText(`Accounts for ${kidName} are listed first`),
	).toBeVisible()
	await modal.getByLabel('Amount').fill('5.50')
	await modal.getByRole('button', { name: 'Transfer' }).click()

	await expect(
		page.getByRole('button', { name: new RegExp(accountName) }),
	).toContainText('$6.50')
	await expect(
		page.getByRole('button', { name: new RegExp(savingsName) }),
	).toContainText('$5.50')

	await page.getByRole('button', { name: 'Transfer money' }).click()
	await modal
		.getByLabel('From account')
		.selectOption({ label: `${savingsName} ($5.50)` })
	await modal
		.getByLabel('To account')
		.selectOption({ label: `${otherAccountName} ($0.00)` })
	await modal.getByLabel('Amount').fill('2.25')
	await modal.getByRole('button', { name: 'Transfer' }).click()

	await expect(
		page.getByRole('button', { name: new RegExp(savingsName) }),
	).toContainText('$3.25')
	await expect(
		page.getByRole('button', { name: new RegExp(otherAccountName) }),
	).toContainText('$2.25')
	await expect(page.getByText('Family Total:')).toContainText('$12.00')
})
