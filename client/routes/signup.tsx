import { LoginRoute } from './login.tsx'

export function Component(handle: Parameters<typeof LoginRoute>[0]) {
	return LoginRoute(handle, { initialMode: 'signup' })
}
