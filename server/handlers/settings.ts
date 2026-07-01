import { type Action } from 'remix/fetch-router'
import { renderProtectedPage } from '#server/protected-page.ts'
import { type routes } from '#server/routes.ts'

export const settings = {
	middleware: [],
	async handler({ request }) {
		return renderProtectedPage(request, 'Settings')
	},
} satisfies Action<typeof routes.settings>
