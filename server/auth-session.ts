import { createCookie } from '@remix-run/cookie'

export const authSessionMaxAgeSeconds = 60 * 60 * 24 * 7
export const rememberedAuthSessionMaxAgeSeconds = 60 * 60 * 24 * 60
export const rememberedAuthSessionRefreshAfterSeconds = 60 * 60 * 24 * 30

const rememberedAuthSessionMaxAgeMs = rememberedAuthSessionMaxAgeSeconds * 1000
const rememberedAuthSessionRefreshAfterMs =
	rememberedAuthSessionRefreshAfterSeconds * 1000

export type AuthSession = {
	id: string
	email: string
}

type RememberedAuthSession = AuthSession & {
	rememberMe: true
	issuedAtMs: number
}

type StoredAuthSession = AuthSession | RememberedAuthSession

export type AuthSessionState = {
	session: AuthSession | null
	headers: Headers | null
	rememberMe: boolean
	refreshAtMs: number | null
	expiresAtMs: number | null
}

let sessionCookie: ReturnType<typeof createCookie> | null = null
let sessionSecret: string | null = null

export function setAuthSessionSecret(secret: string) {
	if (!secret) {
		throw new Error('Missing COOKIE_SECRET for session signing.')
	}

	if (sessionCookie && sessionSecret === secret) {
		return
	}

	sessionSecret = secret
	sessionCookie = createCookie('kids-ledger_session', {
		httpOnly: true,
		sameSite: 'Lax',
		path: '/',
		maxAge: authSessionMaxAgeSeconds,
		secrets: [secret],
	})
}

function getSessionCookie() {
	if (!sessionCookie) {
		throw new Error('Session cookie not configured. Call setAuthSessionSecret.')
	}

	return sessionCookie
}

function isAuthSession(value: unknown): value is AuthSession {
	if (!value || typeof value !== 'object') return false
	const record = value as Record<string, unknown>
	return (
		typeof record.id === 'string' &&
		record.id.length > 0 &&
		typeof record.email === 'string' &&
		record.email.length > 0
	)
}

function isStoredAuthSession(value: unknown): value is StoredAuthSession {
	if (!isAuthSession(value)) {
		return false
	}

	const record = value as Record<string, unknown>
	if (record.rememberMe === undefined && record.issuedAtMs === undefined) {
		return true
	}

	return (
		record.rememberMe === true &&
		typeof record.issuedAtMs === 'number' &&
		Number.isFinite(record.issuedAtMs) &&
		record.issuedAtMs > 0
	)
}

function isRememberedAuthSession(
	session: StoredAuthSession,
): session is RememberedAuthSession {
	return 'rememberMe' in session && session.rememberMe === true
}

function createStoredAuthSession(
	session: AuthSession,
	rememberMe: boolean,
	now: number,
): StoredAuthSession {
	if (!rememberMe) {
		return session
	}

	return {
		...session,
		rememberMe: true,
		issuedAtMs: now,
	}
}

function parseStoredAuthSession(stored: string) {
	try {
		const parsed = JSON.parse(stored)
		return isStoredAuthSession(parsed) ? parsed : null
	} catch {
		return null
	}
}

function normalizeProto(value: string) {
	return value.trim().replace(/^"|"$/g, '').toLowerCase()
}

function getForwardedProto(request: Request) {
	const forwarded = request.headers.get('forwarded')
	if (forwarded) {
		for (const entry of forwarded.split(',')) {
			for (const pair of entry.split(';')) {
				const [key, rawValue] = pair.split('=')
				if (!key || !rawValue) continue
				if (key.trim().toLowerCase() === 'proto') {
					return normalizeProto(rawValue)
				}
			}
		}
	}

	const xForwardedProto = request.headers.get('x-forwarded-proto')
	if (xForwardedProto) {
		return normalizeProto(xForwardedProto.split(',')[0] ?? '')
	}

	return null
}

export function isSecureRequest(request: Request) {
	const forwardedProto = getForwardedProto(request)
	if (forwardedProto) {
		return forwardedProto === 'https'
	}

	return new URL(request.url).protocol === 'https:'
}

export async function createAuthCookie(
	session: AuthSession,
	options: {
		secure: boolean
		rememberMe?: boolean
		now?: number
	},
) {
	const rememberMe = options.rememberMe === true
	return getSessionCookie().serialize(
		JSON.stringify(
			createStoredAuthSession(session, rememberMe, options.now ?? Date.now()),
		),
		{
			secure: options.secure,
			maxAge: rememberMe
				? rememberedAuthSessionMaxAgeSeconds
				: authSessionMaxAgeSeconds,
		},
	)
}

export async function destroyAuthCookie(secure: boolean) {
	return getSessionCookie().serialize('', {
		secure,
		maxAge: 0,
		expires: new Date(0),
	})
}

export async function readAuthSessionState(
	request: Request,
	options?: { now?: number },
): Promise<AuthSessionState> {
	const cookieHeader = request.headers.get('Cookie')
	if (!cookieHeader) {
		return {
			session: null,
			headers: null,
			rememberMe: false,
			refreshAtMs: null,
			expiresAtMs: null,
		}
	}

	const stored = await getSessionCookie().parse(cookieHeader)
	if (!stored || typeof stored !== 'string') {
		return {
			session: null,
			headers: null,
			rememberMe: false,
			refreshAtMs: null,
			expiresAtMs: null,
		}
	}

	const parsed = parseStoredAuthSession(stored)
	if (!parsed) {
		return {
			session: null,
			headers: null,
			rememberMe: false,
			refreshAtMs: null,
			expiresAtMs: null,
		}
	}

	const session = {
		id: parsed.id,
		email: parsed.email,
	}

	if (!isRememberedAuthSession(parsed)) {
		return {
			session,
			headers: null,
			rememberMe: false,
			refreshAtMs: null,
			expiresAtMs: null,
		}
	}

	const now = options?.now ?? Date.now()
	const refreshAtMs = parsed.issuedAtMs + rememberedAuthSessionRefreshAfterMs
	const expiresAtMs = parsed.issuedAtMs + rememberedAuthSessionMaxAgeMs

	if (now < refreshAtMs) {
		return {
			session,
			headers: null,
			rememberMe: true,
			refreshAtMs,
			expiresAtMs,
		}
	}

	const refreshedAtMs = now
	const refreshedCookie = await createAuthCookie(session, {
		secure: isSecureRequest(request),
		rememberMe: true,
		now: refreshedAtMs,
	})

	return {
		session,
		headers: new Headers({ 'Set-Cookie': refreshedCookie }),
		rememberMe: true,
		refreshAtMs: refreshedAtMs + rememberedAuthSessionRefreshAfterMs,
		expiresAtMs: refreshedAtMs + rememberedAuthSessionMaxAgeMs,
	}
}

export async function readAuthSession(request: Request) {
	const state = await readAuthSessionState(request)
	return state.session
}
