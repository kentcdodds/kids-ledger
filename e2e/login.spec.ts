import {
	ensureUserExists,
	expect,
	loginViaUi,
	test,
	type Page,
} from './playwright-utils.ts'

const testUser = { email: 'user@example.com', password: 'password123' }
const secondsPerDay = 60 * 60 * 24

async function expectSessionCookieLifetimeInDays(
	page: Page,
	minDays: number,
	maxDays: number,
) {
	const sessionCookie = (await page.context().cookies()).find(
		(cookie) => cookie.name === 'kids-ledger_session',
	)
	expect(sessionCookie).toBeDefined()
	const issuedAtSeconds = Math.floor(Date.now() / 1000)
	const lifetimeSeconds = (sessionCookie?.expires ?? 0) - issuedAtSeconds
	expect(lifetimeSeconds).toBeGreaterThan(minDays * secondsPerDay)
	expect(lifetimeSeconds).toBeLessThan(maxDays * secondsPerDay)
}

test('logs in with email and password', async ({ page }) => {
	await ensureUserExists(page.request, testUser)
	await page.context().clearCookies()
	await loginViaUi(page, testUser)

	await expect(page).toHaveURL(/\/account$/)
	await expect(
		page.getByRole('heading', { name: `Welcome, ${testUser.email}` }),
	).toBeVisible()
	await expectSessionCookieLifetimeInDays(page, 6, 8)
})

test('extends login lifetime when remember me is checked', async ({ page }) => {
	await ensureUserExists(page.request, {
		email: 'remember-me@example.com',
		password: testUser.password,
	})
	await page.context().clearCookies()
	await loginViaUi(
		page,
		{ email: 'remember-me@example.com', password: testUser.password },
		{ rememberMe: true },
	)

	await expect(page).toHaveURL(/\/account$/)
	await expect(
		page.getByRole('heading', { name: 'Welcome, remember-me@example.com' }),
	).toBeVisible()
	await expectSessionCookieLifetimeInDays(page, 59, 61)
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
