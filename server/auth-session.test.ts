/// <reference types="bun" />
import { beforeAll, expect, test } from 'bun:test'
import {
	authSessionMaxAgeSeconds,
	createAuthCookie,
	readAuthSessionState,
	rememberedAuthSessionMaxAgeSeconds,
	rememberedAuthSessionRefreshAfterSeconds,
	setAuthSessionSecret,
} from './auth-session.ts'

const testCookieSecret = 'test-cookie-secret-0123456789abcdef0123456789'
const baseSession = { id: '1', email: 'test@example.com' }

function toCookieHeader(setCookieHeader: string) {
	return setCookieHeader.split(';')[0] ?? ''
}

function createSessionRequest(cookieHeader: string) {
	return new Request('http://example.com/session', {
		headers: { Cookie: cookieHeader },
	})
}

beforeAll(() => {
	setAuthSessionSecret(testCookieSecret)
})

test('readAuthSessionState keeps standard sessions readable without refreshing', async () => {
	const issuedAtMs = Date.UTC(2026, 0, 1)
	const setCookieHeader = await createAuthCookie(baseSession, {
		secure: false,
		now: issuedAtMs,
	})
	const state = await readAuthSessionState(
		createSessionRequest(toCookieHeader(setCookieHeader)),
		{ now: issuedAtMs + authSessionMaxAgeSeconds * 1000 - 1_000 },
	)

	expect(state.session).toEqual(baseSession)
	expect(state.rememberMe).toBe(false)
	expect(state.headers).toBeNull()
	expect(state.refreshAtMs).toBeNull()
	expect(state.expiresAtMs).toBeNull()
})

test('readAuthSessionState refreshes remembered sessions after 30 days', async () => {
	const issuedAtMs = Date.UTC(2026, 0, 1)
	const setCookieHeader = await createAuthCookie(baseSession, {
		secure: false,
		rememberMe: true,
		now: issuedAtMs,
	})
	const refreshedAtMs =
		issuedAtMs + rememberedAuthSessionRefreshAfterSeconds * 1000 + 1_000
	const state = await readAuthSessionState(
		createSessionRequest(toCookieHeader(setCookieHeader)),
		{ now: refreshedAtMs },
	)

	expect(state.session).toEqual(baseSession)
	expect(state.rememberMe).toBe(true)
	expect(state.headers?.get('Set-Cookie')).toContain(
		`Max-Age=${rememberedAuthSessionMaxAgeSeconds}`,
	)
	expect(state.refreshAtMs).toBe(
		refreshedAtMs + rememberedAuthSessionRefreshAfterSeconds * 1000,
	)
	expect(state.expiresAtMs).toBe(
		refreshedAtMs + rememberedAuthSessionMaxAgeSeconds * 1000,
	)
})
