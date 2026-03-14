import { type BuildAction } from 'remix/fetch-router'
import { readAuthSessionState } from '#server/auth-session.ts'
import { type routes } from '#server/routes.ts'

function jsonResponse(data: unknown, init?: ResponseInit) {
	const headers = new Headers(init?.headers)
	headers.set('Content-Type', 'application/json')
	headers.set('Cache-Control', 'no-store')

	return new Response(JSON.stringify(data), {
		...init,
		headers,
	})
}

export const session = {
	middleware: [],
	async action({ request }) {
		const authSession = await readAuthSessionState(request)
		if (!authSession.session) {
			return jsonResponse({ ok: false })
		}

		return jsonResponse(
			{ ok: true, session: { email: authSession.session.email } },
			{ headers: authSession.headers ?? undefined },
		)
	},
} satisfies BuildAction<
	typeof routes.session.method,
	typeof routes.session.pattern
>
