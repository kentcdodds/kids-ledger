import { type Action } from 'remix/fetch-router'
import { type routes } from '#server/routes.ts'
import { createAuthPageHandler } from './auth-page.ts'

export const login = createAuthPageHandler() satisfies Action<
	typeof routes.login
>
