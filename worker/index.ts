import { createRequestHandler } from 'react-router'
import { DB } from './db/index.ts'

declare module 'react-router' {
	export interface AppLoadContext {
		db: DB
		cloudflare: {
			env: Env
			ctx: ExecutionContext
		}
	}
}

const requestHandler = createRequestHandler(
	() => import('virtual:react-router/server-build'),
	import.meta.env.MODE,
)

export default {
	async fetch(request, env, ctx) {
		return requestHandler(request, {
			db: await DB.getInstance(env),
			cloudflare: { env, ctx },
		})
	},
} satisfies ExportedHandler<Env>
