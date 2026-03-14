import {
	expect,
	test as base,
	type APIRequestContext,
	type Locator,
	type Page,
} from '@playwright/test'
import * as setCookieParser from 'set-cookie-parser'

export * from '@playwright/test'

type UserCredentials = {
	email: string
	password: string
}

type CreateKidWithAccountOptions = {
	kidName?: string
	accountName?: string
	kidEmoji?: string
}

type CreateKidOptions = {
	kidName?: string
	kidEmoji?: string
}

async function postAuth(
	request: APIRequestContext,
	credentials: UserCredentials,
	mode: 'signup' | 'login',
) {
	return request.post('/auth', {
		data: { ...credentials, mode },
		headers: { 'Content-Type': 'application/json' },
	})
}

export async function ensureUserExists(
	request: APIRequestContext,
	options?: Partial<UserCredentials>,
) {
	const credentials = {
		email: options?.email ?? `user-${crypto.randomUUID()}@example.com`,
		password: options?.password ?? 'password123',
	}
	const response = await postAuth(request, credentials, 'signup')
	if (!response.ok() && response.status() !== 409) {
		throw new Error(`Failed to seed user (${response.status()}).`)
	}
	return credentials
}

export async function loginViaUi(
	page: Page,
	credentials: UserCredentials,
	options?: { rememberMe?: boolean },
) {
	await page.goto('/login')
	await page.getByLabel('Email').fill(credentials.email)
	await page.getByLabel('Password').fill(credentials.password)
	if (options?.rememberMe) {
		await page.getByLabel('Remember me for 2 months').check()
	}
	await page.getByRole('button', { name: 'Sign in' }).click()
}

export async function createKidWithAccount(
	page: Page,
	options: CreateKidWithAccountOptions = {},
) {
	await page.goto('/settings')
	const { kidName, kidCard } = await createKid(page, options)
	const accountName = await addAccountToKidCard(kidCard, options.accountName)
	return { kidName, accountName, kidCard }
}

/**
 * Creates a kid on the settings page.
 * Precondition: the current page is `/settings`.
 */
export async function createKid(page: Page, options: CreateKidOptions = {}) {
	const kidName = options.kidName ?? `Kid-${crypto.randomUUID().slice(0, 6)}`
	if (options.kidEmoji) {
		await page
			.getByRole('textbox', { name: 'Kid emoji' })
			.fill(options.kidEmoji)
	}
	await page.getByPlaceholder('Kid name').fill(kidName)
	await page.getByRole('button', { name: 'Add' }).first().click()
	const kidNameInput = page.getByRole('textbox', { name: `${kidName} name` })
	await expect(kidNameInput).toBeVisible()
	const kidCard = page.locator('article').filter({ has: kidNameInput }).first()
	return { kidName, kidCard }
}

export async function addAccountToKidCard(
	kidCard: Locator,
	accountName = `Spending-${crypto.randomUUID().slice(0, 6)}`,
) {
	await kidCard.getByPlaceholder('New account name').fill(accountName)
	await kidCard.getByRole('button', { name: 'Add account' }).click()
	await expect(
		kidCard.getByRole('textbox', { name: `${accountName} name` }),
	).toHaveValue(accountName)
	return accountName
}

export const test = base.extend<{
	insertNewUser(options?: {
		email?: string
		password?: string
	}): Promise<{ email: string; password: string }>
	login(options?: {
		email?: string
		password?: string
	}): Promise<{ email: string; password: string }>
}>({
	insertNewUser: async ({ page }, use) => {
		await use(async (options) => {
			return ensureUserExists(page.request, options)
		})
	},
	login: async ({ page }, use) => {
		await use(async (options) => {
			const credentials = await ensureUserExists(page.request, options)
			const response = await postAuth(page.request, credentials, 'login')
			if (!response.ok()) {
				throw new Error(`Failed to login user (${response.status()}).`)
			}

			const setCookieHeader = response.headers()['set-cookie']
			if (setCookieHeader) {
				const parsed = setCookieParser.parseString(setCookieHeader)
				const cookieConfig = {
					name: parsed.name,
					value: parsed.value,
					domain: 'localhost',
					path: parsed.path || '/',
					httpOnly: parsed.httpOnly,
					secure: parsed.secure,
					sameSite: parsed.sameSite as 'Strict' | 'Lax' | 'None',
				}
				await page.context().addCookies([cookieConfig])
			}

			return credentials
		})
	},
})
