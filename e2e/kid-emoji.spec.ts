import { createKid, expect, test } from './playwright-utils.ts'

test('kid emoji fields preserve full emoji graphemes', async ({
	page,
	login,
}) => {
	const kidName = `Kid-${crypto.randomUUID().slice(0, 6)}`
	const flagEmoji = '🇺🇸'
	const familyEmoji = '👨‍👩‍👧‍👦'

	await login()
	await page.goto('/settings')
	await createKid(page, { kidName, kidEmoji: flagEmoji })

	const kidEmojiInput = page.getByRole('textbox', { name: `${kidName} emoji` })
	await expect(kidEmojiInput).toHaveValue(flagEmoji)

	await kidEmojiInput.fill(familyEmoji)
	await kidEmojiInput.blur()
	await expect(kidEmojiInput).toHaveValue(familyEmoji)

	await page.goto('/')
	await expect(
		page.getByRole('heading', { name: `${familyEmoji} ${kidName}` }),
	).toBeVisible()
})
