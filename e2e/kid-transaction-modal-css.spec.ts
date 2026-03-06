import { createKidWithAccount, expect, test } from './playwright-utils.ts'

test('kid emoji background appears while transaction and custom CSS modals are open', async ({
	page,
	login,
}) => {
	const kidEmoji = '🦖'
	const encodedKidEmoji = encodeURIComponent(kidEmoji).toLowerCase()

	await login()
	const { accountName, kidCard } = await createKidWithAccount(page, {
		kidEmoji,
	})

	await kidCard.getByTitle('Customize transaction modal').click()
	const customizationDialog = page.getByRole('dialog')
	await expect(customizationDialog).toBeVisible()

	const customCssModalBackground = await page.evaluate(() => ({
		backgroundImage: document.body.style
			.getPropertyValue('--kid-modal-background-image')
			.toLowerCase(),
		isOpen: document.body.dataset.kidModalOpen,
	}))
	expect(customCssModalBackground.isOpen).toBe('true')
	expect(customCssModalBackground.backgroundImage).toContain(encodedKidEmoji)

	await customizationDialog.getByRole('button', { name: 'Close' }).click()
	await expect(customizationDialog).toBeHidden()
	await expect
		.poll(async () =>
			page.evaluate(() => ({
				backgroundImage: document.body.style.getPropertyValue(
					'--kid-modal-background-image',
				),
				isOpen: document.body.dataset.kidModalOpen ?? '',
			})),
		)
		.toEqual({ backgroundImage: '', isOpen: '' })

	await page.goto('/')
	await page.getByRole('button', { name: new RegExp(accountName) }).click()
	const transactionDialog = page.getByRole('dialog')
	await expect(transactionDialog).toBeVisible()

	const transactionModalBackground = await page.evaluate(() => ({
		backgroundImage: document.body.style
			.getPropertyValue('--kid-modal-background-image')
			.toLowerCase(),
		isOpen: document.body.dataset.kidModalOpen,
	}))
	expect(transactionModalBackground.isOpen).toBe('true')
	expect(transactionModalBackground.backgroundImage).toContain(encodedKidEmoji)

	await transactionDialog.getByRole('button', { name: 'Close' }).click()
	await expect(transactionDialog).toBeHidden()
	await expect
		.poll(async () =>
			page.evaluate(() => ({
				backgroundImage: document.body.style.getPropertyValue(
					'--kid-modal-background-image',
				),
				isOpen: document.body.dataset.kidModalOpen ?? '',
			})),
		)
		.toEqual({ backgroundImage: '', isOpen: '' })
})

test('kid transaction modal custom css applies only while open', async ({
	page,
	login,
}) => {
	await login()
	const { accountName, kidCard } = await createKidWithAccount(page)
	const initialBodyBackgroundImage = await page.evaluate(() =>
		window.getComputedStyle(document.body).backgroundImage.toLowerCase(),
	)

	await kidCard.getByTitle('Customize transaction modal').click()

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
	expect(bodyBackgroundImageAfterClose).toBe(initialBodyBackgroundImage)
})
