import { type BuildAction } from 'remix/fetch-router'
import { renderProtectedPage } from '#server/protected-page.ts'
import { type routes } from '#server/routes.ts'

export const history = {
	middleware: [],
	async action({ request }) {
		return renderProtectedPage(request, 'History')
	},
} satisfies BuildAction<
	typeof routes.history.method,
	typeof routes.history.pattern
>
