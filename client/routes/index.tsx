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

const appTitle = 'Kids Ledger'

type RouteParams = Record<string, string>

type MetaData = {
	title?: string | null
}

type RouteModule = {
	Component: (...args: Array<any>) => any
	getMetadata?: (args: { url: URL; params: RouteParams }) => MetaData
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

function matchClientRoute(pathname: string) {
	for (const [pattern, route] of Object.entries(clientRoutes)) {
		const urlPattern = new URLPattern({ pathname: pattern })
		const result = urlPattern.exec({ pathname })
		if (!result) continue
		return {
			route,
			params: result.pathname.groups as Record<string, string>,
		}
	}
	return null
}

function formatDocumentTitle(pageTitle: string | null = null) {
	if (!pageTitle) return appTitle
	return `${pageTitle} | ${appTitle}`
}

export function getClientDocumentTitle(url: URL) {
	const match = matchClientRoute(url.pathname)
	if (!match) return formatDocumentTitle('Not Found')
	const title =
		match.route.getMetadata?.({ url, params: match.params }).title ?? null
	return formatDocumentTitle(title)
}
