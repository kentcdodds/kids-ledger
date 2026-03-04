import { type BuildAction } from 'remix/fetch-router'
import { readAuthSession } from '#server/auth-session.ts'
import { redirectToLogin } from '#server/auth-redirect.ts'
import { Layout } from '#server/layout.ts'
import { render } from '#server/render.ts'
import { type routes } from '#server/routes.ts'

export const settings = {
	middleware: [],
	async action({ request }) {
		const session = await readAuthSession(request)
		if (!session) return redirectToLogin(request)
		return render(Layout({ title: 'Settings' }))
	},
} satisfies BuildAction<
	typeof routes.settings.method,
	typeof routes.settings.pattern
>
