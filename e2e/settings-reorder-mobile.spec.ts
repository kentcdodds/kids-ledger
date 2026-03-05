import { expect, test } from './playwright-utils.ts'

test.use({ viewport: { width: 390, height: 844 } })

test('settings supports button-based kid and account reordering on mobile', async ({
	page,
	login,
}) => {
	const kidNameA = `Kid-A-${crypto.randomUUID().slice(0, 6)}`
	const kidNameB = `Kid-B-${crypto.randomUUID().slice(0, 6)}`
	const accountNameA = `Save-${crypto.randomUUID().slice(0, 6)}`
	const accountNameB = `Spend-${crypto.randomUUID().slice(0, 6)}`

	await login()
	await page.goto('/settings')

	await page.getByPlaceholder('Kid name').fill(kidNameA)
	await page.getByRole('button', { name: 'Add' }).first().click()
	await expect(
		page.getByRole('textbox', { name: `${kidNameA} name` }),
	).toBeVisible()

	await page.getByPlaceholder('Kid name').fill(kidNameB)
	await page.getByRole('button', { name: 'Add' }).first().click()
	await expect(
		page.getByRole('textbox', { name: `${kidNameB} name` }),
	).toBeVisible()

	const kidANameInput = page.getByRole('textbox', { name: `${kidNameA} name` })
	const kidBNameInput = page.getByRole('textbox', { name: `${kidNameB} name` })
	const kidABeforeY = (await kidANameInput.boundingBox())?.y ?? Infinity
	const kidBBeforeY = (await kidBNameInput.boundingBox())?.y ?? Infinity
	expect(kidABeforeY).toBeLessThan(kidBBeforeY)
	await expect(
		page.getByRole('button', { name: `Move ${kidNameA} up` }),
	).toBeDisabled()
	await expect(
		page.getByRole('button', { name: `Move ${kidNameB} down` }),
	).toBeDisabled()

	await page.getByRole('button', { name: `Move ${kidNameB} up` }).click()

	await expect
		.poll(async () =>
			page.evaluate(() =>
				Array.from(
					document.querySelectorAll<HTMLInputElement>('input[data-kid-name]'),
				).map((input) => input.value),
			),
		)
		.toEqual([kidNameB, kidNameA])
	await expect(
		page.getByRole('button', { name: `Move ${kidNameB} up` }),
	).toBeDisabled()
	await expect(
		page.getByRole('button', { name: `Move ${kidNameA} down` }),
	).toBeDisabled()

	await page.getByRole('button', { name: `Move ${kidNameB} down` }).click()

	await expect
		.poll(async () =>
			page.evaluate(() =>
				Array.from(
					document.querySelectorAll<HTMLInputElement>('input[data-kid-name]'),
				).map((input) => input.value),
			),
		)
		.toEqual([kidNameA, kidNameB])
	await expect(
		page.getByRole('button', { name: `Move ${kidNameA} up` }),
	).toBeDisabled()
	await expect(
		page.getByRole('button', { name: `Move ${kidNameB} down` }),
	).toBeDisabled()

	const kidBCard = page
		.locator('article')
		.filter({ has: page.getByRole('textbox', { name: `${kidNameB} name` }) })
		.first()
	await kidBCard.getByPlaceholder('New account name').fill(accountNameA)
	await kidBCard.getByRole('button', { name: 'Add account' }).click()
	await expect(
		kidBCard.getByRole('textbox', { name: `${accountNameA} name` }),
	).toBeVisible()

	await kidBCard.getByPlaceholder('New account name').fill(accountNameB)
	await kidBCard.getByRole('button', { name: 'Add account' }).click()
	await expect(
		kidBCard.getByRole('textbox', { name: `${accountNameB} name` }),
	).toBeVisible()

	const accountAInput = kidBCard.getByRole('textbox', {
		name: `${accountNameA} name`,
	})
	const accountBInput = kidBCard.getByRole('textbox', {
		name: `${accountNameB} name`,
	})
	const accountABeforeY = (await accountAInput.boundingBox())?.y ?? Infinity
	const accountBBeforeY = (await accountBInput.boundingBox())?.y ?? Infinity
	expect(accountABeforeY).toBeLessThan(accountBBeforeY)
	await expect(
		kidBCard.getByRole('button', { name: `Move ${accountNameA} up` }),
	).toBeDisabled()
	await expect(
		kidBCard.getByRole('button', { name: `Move ${accountNameB} down` }),
	).toBeDisabled()

	await kidBCard
		.getByRole('button', { name: `Move ${accountNameB} up` })
		.click()

	await expect
		.poll(async () =>
			kidBCard.evaluate((card) =>
				Array.from(
					card.querySelectorAll<HTMLInputElement>('input[data-account-name]'),
				).map((input) => input.value),
			),
		)
		.toEqual([accountNameB, accountNameA])
	await expect(
		kidBCard.getByRole('button', { name: `Move ${accountNameB} up` }),
	).toBeDisabled()
	await expect(
		kidBCard.getByRole('button', { name: `Move ${accountNameA} down` }),
	).toBeDisabled()

	await kidBCard
		.getByRole('button', { name: `Move ${accountNameB} down` })
		.click()

	await expect
		.poll(async () =>
			kidBCard.evaluate((card) =>
				Array.from(
					card.querySelectorAll<HTMLInputElement>('input[data-account-name]'),
				).map((input) => input.value),
			),
		)
		.toEqual([accountNameA, accountNameB])
	await expect(
		kidBCard.getByRole('button', { name: `Move ${accountNameA} up` }),
	).toBeDisabled()
	await expect(
		kidBCard.getByRole('button', { name: `Move ${accountNameB} down` }),
	).toBeDisabled()
})
