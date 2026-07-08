/** @jsxImportSource remix/ui */
/** @jsxRuntime automatic */
import { renderToStream } from 'remix/ui/server'
import { readAuthSessionState, setAuthSessionSecret } from './auth-session.ts'
import { type AppEnv } from '#types/env-schema.ts'
import { SsrDocument } from './ssr-document.tsx'

export type RenderAppPageInput = {
	request: Request
	appEnv: AppEnv
	title?: string | null
	notFound?: boolean
	status?: number
	authSessionState?: Awaited<ReturnType<typeof readAuthSessionState>>
}

export function getRequestUrl(request: Request) {
	const url = new URL(request.url)
	return `${url.pathname}${url.search}${url.hash}`
}

export async function renderAppPage(input: RenderAppPageInput) {
	const { appEnv, request } = input
	setAuthSessionSecret(appEnv.COOKIE_SECRET)
	const authSessionState =
		input.authSessionState ?? (await readAuthSessionState(request))
	const session = authSessionState.session
		? { email: authSessionState.session.email }
		: null

	const stream = renderToStream(
		<SsrDocument
			title={input.title}
			url={getRequestUrl(request)}
			session={session}
			notFound={input.notFound}
		/>,
		{
			frameSrc: request.url,
			onError(error) {
				console.error('SSR render error:', error)
			},
		},
	)

	const headers = new Headers({
		'Cache-Control': 'no-store',
		'Content-Type': 'text/html; charset=utf-8',
	})
	if (authSessionState.headers) {
		for (const [key, value] of authSessionState.headers) {
			headers.append(key, value)
		}
	}

	return new Response(stream, {
		status: input.status ?? 200,
		headers,
	})
}
