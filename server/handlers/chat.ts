import { type BuildAction } from 'remix/fetch-router'
import { renderProtectedPage } from '#server/protected-page.ts'
import { type routes } from '#server/routes.ts'

export const chat = {
	middleware: [],
	async action({ request }) {
		return renderProtectedPage(request, 'Chat')
	},
} satisfies BuildAction<typeof routes.chat.method, typeof routes.chat.pattern>
