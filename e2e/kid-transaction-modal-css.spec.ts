import { expect, test } from './playwright-utils.ts'

test('kid transaction modal custom css applies only while open', async ({
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

	await kidCard
		.getByRole('button', { name: 'Customize transaction modal' })
		.click()

	const customizationDialog = page.getByRole('dialog')
	await expect(customizationDialog).toBeVisible()
	const livePreview = customizationDialog.locator(
		'[data-kid-transaction-modal-preview]',
	)
	await expect(livePreview).toBeVisible()
	await customizationDialog
		.getByRole('textbox', { name: 'Custom CSS declarations' })
		.fill(
			[
				':root {',
				'	--font-family: "Courier New", monospace;',
				'	--color-surface: #fff7dd;',
				'	--color-border: #f59e0b;',
				'}',
				'',
				'body {',
				'	background-image: none !important;',
				'}',
			].join('\n'),
		)

	const livePreviewFontFamily = await livePreview.evaluate((element) =>
		window.getComputedStyle(element).fontFamily.toLowerCase(),
	)
	expect(livePreviewFontFamily).toContain('courier new')

	await customizationDialog.getByRole('button', { name: 'Save CSS' }).click()
	await expect(customizationDialog).toBeHidden()

	await page.goto('/')
	await page.getByRole('button', { name: new RegExp(accountName) }).click()
	const transactionDialog = page.getByRole('dialog')
	await expect(transactionDialog).toBeVisible()

	const fontFamily = await transactionDialog.evaluate((element) =>
		window.getComputedStyle(element).fontFamily.toLowerCase(),
	)
	expect(fontFamily).toContain('courier new')
	const bodyBackgroundImageWhileOpen = await page.evaluate(() =>
		window.getComputedStyle(document.body).backgroundImage.toLowerCase(),
	)
	expect(bodyBackgroundImageWhileOpen).toBe('none')

	const customStyleTagCountWhileOpen = await page
		.locator('style[data-kid-transaction-modal-css]')
		.count()
	expect(customStyleTagCountWhileOpen).toBe(1)

	await transactionDialog.getByRole('button', { name: 'Close' }).click()
	await expect(transactionDialog).toBeHidden()

	await expect
		.poll(async () =>
			page.locator('style[data-kid-transaction-modal-css]').count(),
		)
		.toBe(0)
	const bodyBackgroundImageAfterClose = await page.evaluate(() =>
		window.getComputedStyle(document.body).backgroundImage.toLowerCase(),
	)
	expect(bodyBackgroundImageAfterClose).not.toBe('none')
})
