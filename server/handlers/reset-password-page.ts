import { type Action } from 'remix/fetch-router'
import { Layout } from '#server/layout.ts'
import { render } from '#server/render.ts'
import { type routes } from '#server/routes.ts'

export const resetPasswordPage = {
	middleware: [],
	async handler({ url }) {
		const title = url.searchParams.get('token')
			? 'Set New Password'
			: 'Reset Password'
		return render(Layout({ title }))
	},
} satisfies Action<typeof routes.resetPassword>
