import { readAuthSession } from '#server/auth-session.ts'
import { Layout } from '#server/layout.ts'
import { render } from '#server/render.ts'
import { normalizeRedirectTarget } from '#shared/redirect-target.ts'

export function createAuthPageHandler() {
	return {
		middleware: [],
		async action({ request }: { request: Request }) {
			const url = new URL(request.url)
			const session = await readAuthSession(request)
			if (session) {
				const redirectTo = normalizeRedirectTarget(
					url.searchParams.get('redirectTo'),
				)
				const redirectTarget = redirectTo ?? '/account'
				return Response.redirect(new URL(redirectTarget, request.url), 302)
			}

			const pageTitle = url.pathname === '/signup' ? 'Sign Up' : 'Sign In'
			return render(Layout({ title: pageTitle }))
		},
	}
}
