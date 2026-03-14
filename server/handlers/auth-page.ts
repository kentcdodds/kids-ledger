import { readAuthSessionState } from '#server/auth-session.ts'
import { Layout } from '#server/layout.ts'
import { render } from '#server/render.ts'
import { normalizeRedirectTarget } from '#shared/redirect-target.ts'

export function createAuthPageHandler() {
	return {
		middleware: [],
		async action({ request }: { request: Request }) {
			const url = new URL(request.url)
			const authSession = await readAuthSessionState(request)
			if (authSession.session) {
				const redirectTo = normalizeRedirectTarget(
					url.searchParams.get('redirectTo'),
				)
				const redirectTarget = redirectTo ?? '/account'
				const response = Response.redirect(
					new URL(redirectTarget, request.url),
					302,
				)
				if (authSession.headers) {
					for (const [key, value] of authSession.headers) {
						response.headers.append(key, value)
					}
				}
				return response
			}

			const pageTitle = url.pathname === '/signup' ? 'Sign Up' : 'Sign In'
			const response = render(Layout({ title: pageTitle }))
			if (authSession.headers) {
				for (const [key, value] of authSession.headers) {
					response.headers.append(key, value)
				}
			}
			return response
		},
	}
}
