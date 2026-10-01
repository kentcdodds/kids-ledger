/// <reference types="bun" />
import { expect, test } from 'bun:test'
import { setAuthSessionSecret } from './auth-session.ts'
import { createAppRouter } from './router.ts'
import { type AppEnv } from '#types/env-schema.ts'

const testCookieSecret = 'test-cookie-secret-0123456789abcdef0123456789'

function createLogoutRouter() {
	setAuthSessionSecret(testCookieSecret)
	const appEnv = {
		COOKIE_SECRET: testCookieSecret,
		APP_DB: {} as D1Database,
	} satisfies AppEnv

	return createAppRouter(appEnv)
}

async function postLogout(headers?: HeadersInit) {
	return createLogoutRouter().fetch(
		new Request('https://example.com/logout', {
			method: 'POST',
			headers,
		}),
	)
}

test('app router rejects cross-site logout requests', async () => {
	const response = await postLogout({ 'Sec-Fetch-Site': 'cross-site' })

	expect(response.status).toBe(403)
})

test('app router allows same-origin logout requests', async () => {
	const response = await postLogout({ 'Sec-Fetch-Site': 'same-origin' })

	expect(response.status).toBe(302)
})

test('app router rejects logout with a cross-origin Origin header', async () => {
	const response = await postLogout({ Origin: 'https://evil.example' })

	expect(response.status).toBe(403)
})

test('app router allows logout without provenance headers', async () => {
	const response = await postLogout()

	expect(response.status).toBe(302)
})
