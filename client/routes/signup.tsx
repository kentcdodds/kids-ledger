import { loader, LoginRoute } from './login.tsx'

export { loader }

export function Component(handle: Parameters<typeof LoginRoute>[0]) {
	return LoginRoute(handle, { initialMode: 'signup' })
}

export function getMetadata() {
	return { title: 'Sign Up' }
}
