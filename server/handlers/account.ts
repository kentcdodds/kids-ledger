import { type Action } from 'remix/router'
import { renderProtectedPage } from '#server/protected-page.ts'
import { type routes } from '#server/routes.ts'

export const account = {
	middleware: [],
	async handler({ request }) {
		return renderProtectedPage(request, 'Account')
	},
} satisfies Action<typeof routes.account>
