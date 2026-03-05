import { type BuildAction } from 'remix/fetch-router'
import { Layout } from '#server/layout.ts'
import { render } from '#server/render.ts'
import { type routes } from '#server/routes.ts'

export const oauthAuthorizePage = {
	middleware: [],
	async action() {
		return render(Layout({ title: 'Authorize App' }))
	},
} satisfies BuildAction<
	typeof routes.oauthAuthorize.method,
	typeof routes.oauthAuthorize.pattern
>
