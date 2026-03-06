import {
	ensureUserExists,
	expect,
	loginViaUi,
	test,
} from './playwright-utils.ts'

const testUser = { email: 'user@example.com', password: 'password123' }

test('logs in with email and password', async ({ page }) => {
	await ensureUserExists(page.request, testUser)
	await page.context().clearCookies()
	await loginViaUi(page, testUser)

	await expect(page).toHaveURL(/\/account$/)
	await expect(
		page.getByRole('heading', { name: `Welcome, ${testUser.email}` }),
	).toBeVisible()
})

test('signs up with email and password', async ({ page }) => {
	const signupUser = {
		email: `new-user-${crypto.randomUUID()}@example.com`,
		password: 'password123',
	}
	await page.goto('/signup')

	await page.getByLabel('Email').fill(signupUser.email)
	await page.getByLabel('Password').fill(signupUser.password)
	await page.getByRole('button', { name: 'Create account' }).click()

	await expect(page).toHaveURL(/\/account$/)
	await expect(
		page.getByRole('heading', { name: `Welcome, ${signupUser.email}` }),
	).toBeVisible()
})
