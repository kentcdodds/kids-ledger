import { setAuthSessionSecret } from './auth-session.ts'
import { getEnv } from './env.ts'
import { createAppRouter } from './router.ts'
import { type AppEnv } from '#types/env-schema.ts'

type AppRouterBundle = {
	appEnv: AppEnv
	router: ReturnType<typeof createAppRouter>
}

const appRouterCache = new WeakMap<Env, AppRouterBundle>()

function getAppRouterBundle(env: Env): AppRouterBundle {
	let bundle = appRouterCache.get(env)
	if (!bundle) {
		const appEnv = getEnv(env)
		bundle = { appEnv, router: createAppRouter(appEnv) }
		appRouterCache.set(env, bundle)
	}
	return bundle
}

export async function handleRequest(request: Request, env: Env) {
	try {
		const { appEnv, router } = getAppRouterBundle(env)
		setAuthSessionSecret(appEnv.COOKIE_SECRET)
		return await router.fetch(request)
	} catch (error) {
		console.error('Remix server handler failed:', error)
		return new Response('Internal Server Error', { status: 500 })
	}
}
