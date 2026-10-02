import { type Handle, type RemixNode } from 'remix/component'
import * as about from './about.tsx'
import * as account from './account.tsx'
import * as chat from './chat.tsx'
import * as history from './history.tsx'
import * as home from './home.tsx'
import * as login from './login.tsx'
import * as oauthAuthorize from './oauth-authorize.tsx'
import * as oauthCallback from './oauth-callback.tsx'
import * as privacyPolicy from './privacy-policy.tsx'
import * as resetPassword from './reset-password.tsx'
import * as settings from './settings.tsx'
import * as signup from './signup.tsx'
import * as termsOfService from './terms-of-service.tsx'
import { readRouterPathname } from '#client/router-location.tsx'

type RouteModule = {
	Component: (handle: Handle) => () => RemixNode
}

export const clientRoutes = {
	'/': home,
	'/about': about,
	'/chat': chat,
	'/history': history,
	'/settings': settings,
	'/account': account,
	'/login': login,
	'/signup': signup,
	'/reset-password': resetPassword,
	'/privacy-policy': privacyPolicy,
	'/terms-of-service': termsOfService,
	'/oauth/authorize': oauthAuthorize,
	'/oauth/callback': oauthCallback,
} satisfies Record<string, RouteModule>

function matchClientRoute(pathname: string): RouteModule | null {
	if (!Object.hasOwn(clientRoutes, pathname)) return null
	return clientRoutes[pathname as keyof typeof clientRoutes]
}

export type RouteOutletProps = {
	notFound?: boolean
	fallback?: RemixNode
}

export function RouteOutlet(handle: Handle<RouteOutletProps>) {
	return () => {
		const { fallback, notFound } = handle.props
		if (notFound) return fallback ?? null
		const route = matchClientRoute(readRouterPathname(handle))
		if (!route) return fallback ?? null
		const RouteComponent = route.Component
		return <RouteComponent />
	}
}
