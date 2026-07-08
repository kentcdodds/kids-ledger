import { readAuthSessionState } from '#server/auth-session.ts'
import { Layout } from '#server/layout.ts'
import { render } from '#server/render.ts'
import { renderAppPage } from '#server/ssr-render.tsx'
import { normalizeRedirectTarget } from '#shared/redirect-target.ts'
import { type AppEnv } from '#types/env-schema.ts'

export function createAuthPageHandler() {
	return {
		middleware: [],
		async handler({ request }: { request: Request }) {
			const url = new URL(request.url)
			const authSession = await readAuthSessionState(request)
			if (authSession.session) {
				const redirectTo = normalizeRedirectTarget(
					url.searchParams.get('redirectTo'),
				)
				const redirectTarget = redirectTo ?? '/account'
				const response = new Response(null, {
					status: 302,
					headers: {
						Location: new URL(redirectTarget, request.url).toString(),
					},
				})
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

export function createSsrAuthPageHandler(appEnv: AppEnv) {
	return {
		middleware: [],
		async handler({ request }: { request: Request }) {
			const url = new URL(request.url)
			const authSession = await readAuthSessionState(request)
			if (authSession.session) {
				const redirectTo = normalizeRedirectTarget(
					url.searchParams.get('redirectTo'),
				)
				const redirectTarget = redirectTo ?? '/account'
				const response = new Response(null, {
					status: 302,
					headers: {
						Location: new URL(redirectTarget, request.url).toString(),
					},
				})
				if (authSession.headers) {
					for (const [key, value] of authSession.headers) {
						response.headers.append(key, value)
					}
				}
				return response
			}

			const pageTitle = url.pathname === '/signup' ? 'Sign Up' : 'Sign In'
			return renderAppPage({
				request,
				appEnv,
				title: pageTitle,
				authSessionState: authSession,
			})
		},
	}
}
