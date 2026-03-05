import { type BuildAction } from 'remix/fetch-router'
import { Layout } from '#server/layout.ts'
import { render } from '#server/render.ts'
import { type routes } from '#server/routes.ts'

export const oauthCallbackPage = {
	middleware: [],
	async action({ url }) {
		const title =
			url.searchParams.get('error') || url.searchParams.get('error_description')
				? 'Authorization Failed'
				: 'Authorization Complete'
		return render(Layout({ title }))
	},
} satisfies BuildAction<
	typeof routes.oauthCallback.method,
	typeof routes.oauthCallback.pattern
>
