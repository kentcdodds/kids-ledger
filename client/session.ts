import { parseJsonOrNull } from '#client/http.ts'

export type SessionInfo = {
	email: string
}

export type SessionStatus = 'idle' | 'loading' | 'ready'

export async function fetchSessionInfo(
	signal?: AbortSignal,
): Promise<SessionInfo | null> {
	try {
		const response = await fetch('/session', {
			headers: { Accept: 'application/json' },
			credentials: 'include',
			signal,
		})
		if (signal?.aborted) return null
		const payload = await parseJsonOrNull<{
			ok?: boolean
			session?: { email?: string }
		}>(response)
		const email =
			response.ok && payload?.ok && typeof payload?.session?.email === 'string'
				? payload.session.email.trim()
				: ''
		return email ? { email } : null
	} catch {
		return null
	}
}

export async function requireSessionOrRedirect(
	signal?: AbortSignal,
	redirectTo = '/login',
): Promise<SessionInfo | null> {
	const session = await fetchSessionInfo(signal)
	if (signal?.aborted || session || typeof window === 'undefined') {
		return session
	}
	window.location.assign(redirectTo)
	return null
}
