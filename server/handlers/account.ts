import { type BuildAction } from 'remix/fetch-router'
import { renderProtectedPage } from '#server/protected-page.ts'
import { type routes } from '#server/routes.ts'

export const account = {
	middleware: [],
	async action({ request }) {
		return renderProtectedPage(request, 'Account')
	},
} satisfies BuildAction<
	typeof routes.account.method,
	typeof routes.account.pattern
>
