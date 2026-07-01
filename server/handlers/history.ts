import { type Action } from 'remix/fetch-router'
import { renderProtectedPage } from '#server/protected-page.ts'
import { type routes } from '#server/routes.ts'

export const history = {
	middleware: [],
	async action({ request }) {
		return renderProtectedPage(request, 'History')
	},
} satisfies Action<typeof routes.history>
