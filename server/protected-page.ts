import { readAuthSession } from '#server/auth-session.ts'
import { redirectToLogin } from '#server/auth-redirect.ts'
import { Layout } from '#server/layout.ts'
import { render } from '#server/render.ts'

export async function renderProtectedPage(request: Request, title: string) {
	const session = await readAuthSession(request)
	if (!session) {
		return redirectToLogin(request)
	}
	return render(Layout({ title }))
}
