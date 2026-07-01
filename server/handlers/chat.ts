import { type Action } from 'remix/fetch-router'
import { renderProtectedPage } from '#server/protected-page.ts'
import { type routes } from '#server/routes.ts'

export const chat = {
	middleware: [],
	async handler({ request }) {
		return renderProtectedPage(request, 'Chat')
	},
} satisfies Action<typeof routes.chat>
