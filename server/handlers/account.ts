import { type Action } from 'remix/fetch-router'
import { renderProtectedPage } from '#server/protected-page.ts'
import { type routes } from '#server/routes.ts'

export const account = {
	middleware: [],
	async action({ request }) {
		return renderProtectedPage(request, 'Account')
	},
} satisfies Action<typeof routes.account>
