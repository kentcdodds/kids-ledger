import { type Action } from 'remix/fetch-router'
import { Layout } from '#server/layout.ts'
import { render } from '#server/render.ts'
import { type routes } from '#server/routes.ts'

export const oauthCallbackPage = {
	middleware: [],
	async handler({ url }) {
		const title =
			url.searchParams.get('error') || url.searchParams.get('error_description')
				? 'Authorization Failed'
				: 'Authorization Complete'
		return render(Layout({ title }))
	},
} satisfies Action<typeof routes.oauthCallback>
