import { parseJsonOrNull } from '#client/http.ts'

export type SessionInfo = {
	email: string
}

export type SessionStatus = 'idle' | 'loading' | 'ready'

export async function fetchSessionInfo(
	signal?: AbortSignal,
	options?: { throwOnError?: boolean },
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
	} catch (error) {
		if (signal?.aborted) return null
		if (options?.throwOnError) {
			throw error
		}
		return null
	}
}

export async function requireSessionOrRedirect(
	signal?: AbortSignal,
	redirectTo = '/login',
): Promise<SessionInfo | null> {
	const session = await fetchSessionInfo(signal, { throwOnError: true })
	if (signal?.aborted || session || typeof window === 'undefined') {
		return session
	}
	window.location.assign(redirectTo)
	return null
}
