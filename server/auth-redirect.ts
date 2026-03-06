import { normalizeRedirectTarget } from '#shared/redirect-target.ts'

type RedirectToLoginOptions = {
	redirectTo?: string
}

export function redirectToLogin(
	request: Request,
	options: RedirectToLoginOptions = {},
) {
	const requestUrl = new URL(request.url)
	const target =
		normalizeRedirectTarget(options.redirectTo ?? null) ??
		`${requestUrl.pathname}${requestUrl.search}`
	const loginUrl = new URL('/login', requestUrl)

	if (target) {
		loginUrl.searchParams.set('redirectTo', target)
	}

	return Response.redirect(loginUrl, 302)
}
