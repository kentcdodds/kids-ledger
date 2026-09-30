import { readAuthSessionState } from '#server/auth-session.ts'
import { redirectToLogin } from '#server/auth-redirect.ts'
import { renderAppPage } from '#server/ssr-render.tsx'
import { type AppEnv } from '#types/env-schema.ts'

export function createProtectedPageHandler(appEnv: AppEnv, title: string) {
	return {
		middleware: [],
		async handler({ request }: { request: Request }) {
			const authSessionState = await readAuthSessionState(request)
			if (!authSessionState.session) {
				return redirectToLogin(request)
			}

			return renderAppPage({
				request,
				appEnv,
				title,
				authSessionState,
			})
		},
	}
}
