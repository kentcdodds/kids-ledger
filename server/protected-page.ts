import { readAuthSessionState } from '#server/auth-session.ts'
import { redirectToLogin } from '#server/auth-redirect.ts'
import { Layout } from '#server/layout.ts'
import { render } from '#server/render.ts'

export async function renderProtectedPage(request: Request, title: string) {
	const authSession = await readAuthSessionState(request)
	if (!authSession.session) {
		return redirectToLogin(request)
	}

	const response = render(Layout({ title }))
	if (authSession.headers) {
		for (const [key, value] of authSession.headers) {
			response.headers.append(key, value)
		}
	}
	return response
}
