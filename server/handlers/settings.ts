import { type BuildAction } from 'remix/fetch-router'
import { renderProtectedPage } from '#server/protected-page.ts'
import { type routes } from '#server/routes.ts'

export const settings = {
	middleware: [],
	async action({ request }) {
		return renderProtectedPage(request, 'Settings')
	},
} satisfies BuildAction<
	typeof routes.settings.method,
	typeof routes.settings.pattern
>
