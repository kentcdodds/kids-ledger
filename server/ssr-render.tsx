/** @jsxImportSource remix/ui */
/** @jsxRuntime automatic */
import { renderToStream } from 'remix/ui/server'
import { readAuthSessionState, setAuthSessionSecret } from './auth-session.ts'
import { loadServerRouteData } from './route-loader-data.ts'
import { type AppEnv } from '#types/env-schema.ts'
import { SsrDocument } from './ssr-document.tsx'
import { type AppLoaderDataEnvelope } from '#shared/route-loader-data.ts'

export type RenderAppPageInput = {
	request: Request
	appEnv: AppEnv
	title?: string | null
	notFound?: boolean
	status?: number
	authSessionState?: Awaited<ReturnType<typeof readAuthSessionState>>
	loaderData?: AppLoaderDataEnvelope | null
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
	const loaderData =
		input.loaderData === undefined
			? await loadServerRouteData({ request, appEnv, authSessionState })
			: input.loaderData

	const stream = renderToStream(
		<SsrDocument
			title={input.title}
			url={getRequestUrl(request)}
			session={session}
			loaderData={loaderData}
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
