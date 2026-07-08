import { css, on, type Handle } from 'remix/ui'
import { getErrorMessage, parseJsonOrNull } from '#client/http.ts'
import {
	tryConsumeRouteLoaderData,
	type ClientRouteLoader,
} from '#client/route-loader-data.tsx'
import { readRouterSearch } from '#client/router-location.tsx'
import {
	fetchSessionInfo,
	type SessionInfo,
	type SessionStatus,
} from '#client/session.ts'
import {
	colors,
	radius,
	shadows,
	spacing,
	typography,
} from '#client/styles/tokens.ts'
import { inputCss, buttonCss } from '#client/styles/form-controls.ts'
import { type OAuthAuthorizeLoaderData } from '#shared/route-loader-data.ts'

type OAuthAuthorizeInfo = {
	client: { id: string; name: string }
	scopes: Array<string>
}

type OAuthAuthorizeStatus = 'idle' | 'loading' | 'ready' | 'error'
type OAuthAuthorizeMessage = { type: 'error' | 'info'; text: string }

function getSearchParams(handle: Handle) {
	return new URLSearchParams(readRouterSearch(handle))
}

async function fetchOAuthAuthorizeLoaderData(
	search: string,
	signal?: AbortSignal,
): Promise<OAuthAuthorizeLoaderData> {
	const [infoResponse, session] = await Promise.all([
		fetch(`/oauth/authorize-info${search}`, {
			headers: { Accept: 'application/json' },
			credentials: 'include',
			signal,
		}),
		fetchSessionInfo(signal),
	])
	const payload = await parseJsonOrNull<{
		ok?: boolean
		error?: string
		client?: OAuthAuthorizeInfo['client']
		scopes?: OAuthAuthorizeInfo['scopes']
	}>(infoResponse)
	if (!infoResponse.ok || !payload?.ok || !payload.client) {
		return {
			info: null,
			session,
			error: getErrorMessage(payload, 'Unable to load authorization details.'),
		}
	}
	return {
		info: {
			client: payload.client,
			scopes: Array.isArray(payload.scopes) ? payload.scopes : [],
		},
		session,
		error: null,
	}
}

export const loader: ClientRouteLoader = async ({ url, signal }) => {
	return {
		oauthAuthorize: await fetchOAuthAuthorizeLoaderData(url.search, signal),
	}
}

export function OAuthAuthorizeRoute(handle: Handle) {
	let info: OAuthAuthorizeInfo | null = null
	let status: OAuthAuthorizeStatus = 'idle'
	let message: OAuthAuthorizeMessage | null = null
	let submitting = false
	let lastSearch = ''
	let session: SessionInfo | null = null
	let sessionStatus: SessionStatus = 'idle'
	let infoRefreshInFlight = false
	let sessionRefreshInFlight = false

	function setMessage(next: OAuthAuthorizeMessage | null) {
		message = next
		handle.update()
	}

	function readQueryError() {
		const params = getSearchParams(handle)
		const description = params.get('error_description')
		if (description) return description
		const error = params.get('error')
		return error ? `Authorization error: ${error}` : null
	}

	async function loadInfo() {
		if (infoRefreshInFlight) return
		infoRefreshInFlight = true
		status = 'loading'

		const queryError = readQueryError()
		if (queryError) {
			message = { type: 'error', text: queryError }
		}

		try {
			const data = await fetchOAuthAuthorizeLoaderData(readRouterSearch(handle))
			applyOAuthAuthorizeData(data)
			if (queryError && !data.error) {
				message = { type: 'error', text: queryError }
			}
		} catch {
			info = null
			status = 'error'
			message = {
				type: 'error',
				text: 'Unable to load authorization details.',
			}
		}
		infoRefreshInFlight = false
		handle.update()
	}

	async function loadSession() {
		if (sessionStatus !== 'idle' || sessionRefreshInFlight) return
		sessionRefreshInFlight = true
		sessionStatus = 'loading'

		session = await fetchSessionInfo()

		sessionStatus = 'ready'
		sessionRefreshInFlight = false
		handle.update()
	}

	function applyOAuthAuthorizeData(data: OAuthAuthorizeLoaderData) {
		session = data.session
		sessionStatus = 'ready'
		if (data.error || !data.info) {
			info = null
			status = 'error'
			message = {
				type: 'error',
				text: data.error ?? 'Unable to load authorization details.',
			}
			return
		}
		info = data.info
		status = 'ready'
		message = null
	}

	function applyRouteLoaderData(currentSearch: string) {
		const data = tryConsumeRouteLoaderData(
			handle,
			'oauthAuthorize',
			`/oauth/authorize${currentSearch}`,
		)
		if (!data) return false
		applyOAuthAuthorizeData(data)
		return true
	}

	async function submitDecision(
		decision: 'approve' | 'deny',
		form?: HTMLFormElement,
	) {
		if (submitting) return
		submitting = true
		handle.update()

		try {
			const body = new URLSearchParams()
			body.set('decision', decision)
			if (decision === 'approve' && form) {
				const formData = new FormData(form)
				const email = String(formData.get('email') ?? '').trim()
				const password = String(formData.get('password') ?? '')
				if (!email || !password) {
					setMessage({
						type: 'error',
						text: 'Email and password are required.',
					})
					submitting = false
					handle.update()
					return
				}
				body.set('email', email)
				body.set('password', password)
			}
			const response = await fetch(window.location.href, {
				method: 'POST',
				headers: {
					Accept: 'application/json',
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				credentials: 'include',
				body,
			})
			const payload = await parseJsonOrNull<{
				error?: string
				redirectTo?: string
			}>(response)
			if (!response.ok) {
				const errorText = getErrorMessage(
					payload,
					'Unable to complete authorization.',
				)
				setMessage({ type: 'error', text: errorText })
				submitting = false
				handle.update()
				return
			}
			if (payload?.redirectTo) {
				window.location.assign(payload.redirectTo)
				return
			}
			setMessage({ type: 'error', text: 'Missing redirect response.' })
		} catch {
			setMessage({
				type: 'error',
				text: 'Network error. Please try again.',
			})
		} finally {
			submitting = false
			handle.update()
		}
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault()
		if (!(event.currentTarget instanceof HTMLFormElement)) return
		const hasSession = Boolean(session?.email)
		await submitDecision(
			'approve',
			hasSession ? undefined : event.currentTarget,
		)
	}

	return () => {
		const currentSearch = readRouterSearch(handle)
		if (currentSearch !== lastSearch) {
			lastSearch = currentSearch
			if (!applyRouteLoaderData(currentSearch)) {
				void loadInfo()
			}
		}
		if (
			sessionStatus === 'idle' &&
			!infoRefreshInFlight &&
			!sessionRefreshInFlight
		) {
			void loadSession()
		}

		const clientLabel = info?.client?.name ?? 'Unknown client'
		const scopes = info?.scopes ?? []
		const scopeLabel =
			scopes.length > 0 ? scopes.join(', ') : 'No scopes requested.'
		const sessionEmail = session?.email ?? ''
		const isSessionReady = sessionStatus === 'ready'
		const isSessionLoading =
			sessionStatus === 'loading' || sessionStatus === 'idle'
		const isLoggedIn = isSessionReady && Boolean(sessionEmail)
		const actionsDisabled = status !== 'ready' || submitting || isSessionLoading
		const formReady = status === 'ready' && !isSessionLoading
		const authorizeLabel = submitting
			? 'Submitting...'
			: isLoggedIn
				? 'Approve connection'
				: 'Authorize'

		return (
			<section
				mix={css({
					maxWidth: '28rem',
					margin: '0 auto',
					display: 'grid',
					gap: spacing.lg,
				})}
			>
				<header mix={css({ display: 'grid', gap: spacing.xs })}>
					<h2
						mix={css({
							fontSize: typography.fontSize.xl,
							fontWeight: typography.fontWeight.semibold,
							color: colors.text,
						})}
					>
						Authorize access
					</h2>
					<p mix={css({ color: colors.textMuted })}>
						{clientLabel} wants to access your kids-ledger account.
					</p>
				</header>
				<section
					mix={css({
						padding: spacing.lg,
						borderRadius: radius.xl,
						border: `3px solid ${colors.border}`,
						backgroundColor: colors.surface,
						boxShadow: shadows.md,
						display: 'grid',
						gap: spacing.sm,
					})}
				>
					<p
						mix={css({
							margin: 0,
							fontWeight: typography.fontWeight.medium,
							color: colors.text,
						})}
					>
						Requested scopes
					</p>
					<p mix={css({ margin: 0, color: colors.textMuted })}>{scopeLabel}</p>
				</section>
				{isSessionLoading ? (
					<p mix={css({ color: colors.textMuted })}>Checking your session…</p>
				) : null}
				{isLoggedIn ? (
					<section
						mix={css({
							padding: spacing.md,
							borderRadius: radius.lg,
							border: `2px solid ${colors.border}`,
							backgroundColor: colors.surface,
							display: 'grid',
							gap: spacing.xs,
						})}
					>
						<p
							mix={css({
								margin: 0,
								fontWeight: typography.fontWeight.medium,
								color: colors.text,
							})}
						>
							Signed in as {sessionEmail}
						</p>
						<p mix={css({ margin: 0, color: colors.textMuted })}>
							Approve to continue with this account.
						</p>
					</section>
				) : null}
				{status === 'loading' ? (
					<p mix={css({ color: colors.textMuted })}>
						Loading authorization details…
					</p>
				) : null}
				{message ? (
					<p
						mix={css({
							color: message.type === 'error' ? colors.error : colors.text,
							fontSize: typography.fontSize.sm,
						})}
						role={message.type === 'error' ? 'alert' : undefined}
					>
						{message.text}
					</p>
				) : null}
				{formReady ? (
					<form
						mix={[
							css({
								display: 'grid',
								gap: spacing.md,
								padding: spacing.lg,
								borderRadius: radius.xl,
								border: `3px solid ${colors.border}`,
								backgroundColor: colors.surface,
								boxShadow: shadows.md,
							}),
							on<HTMLElement, 'submit'>('submit', handleSubmit),
						]}
					>
						{!isLoggedIn && isSessionReady ? (
							<>
								<label mix={css({ display: 'grid', gap: spacing.xs })}>
									<span
										mix={css({
											color: colors.text,
											fontWeight: typography.fontWeight.medium,
											fontSize: typography.fontSize.sm,
										})}
									>
										Email
									</span>
									<input
										type="email"
										name="email"
										required
										autoComplete="email"
										placeholder="you@example.com"
										disabled={actionsDisabled}
										mix={css({
											...inputCss,
											fontSize: typography.fontSize.base,
											fontFamily: typography.fontFamily,
										})}
									/>
								</label>
								<label mix={css({ display: 'grid', gap: spacing.xs })}>
									<span
										mix={css({
											color: colors.text,
											fontWeight: typography.fontWeight.medium,
											fontSize: typography.fontSize.sm,
										})}
									>
										Password
									</span>
									<input
										type="password"
										name="password"
										required
										autoComplete="current-password"
										placeholder="Enter your password"
										disabled={actionsDisabled}
										mix={css({
											...inputCss,
											fontSize: typography.fontSize.base,
											fontFamily: typography.fontFamily,
										})}
									/>
								</label>
							</>
						) : null}
						<div
							mix={css({ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' })}
						>
							<button
								type="submit"
								disabled={actionsDisabled}
								mix={css({
									...buttonCss,
									padding: `${spacing.sm} ${spacing.lg}`,
									borderRadius: radius.full,
									fontSize: typography.fontSize.base,
									cursor: actionsDisabled ? 'not-allowed' : 'pointer',
									opacity: actionsDisabled ? 0.7 : 1,
								})}
							>
								{authorizeLabel}
							</button>
							<button
								type="button"
								disabled={actionsDisabled}
								mix={[
									css({
										...buttonCss,
										padding: `${spacing.sm} ${spacing.lg}`,
										borderRadius: radius.full,
										border: `2px solid ${colors.border}`,
										backgroundColor: colors.surface,
										color: colors.text,
										fontSize: typography.fontSize.base,
										cursor: actionsDisabled ? 'not-allowed' : 'pointer',
										opacity: actionsDisabled ? 0.7 : 1,
										boxShadow: `0 4px 0 0 ${colors.border}`,
										'&:active': actionsDisabled
											? undefined
											: {
													transform: 'translateY(4px)',
													boxShadow: `0 0 0 0 ${colors.border}`,
												},
									}),
									on<HTMLElement, 'click'>('click', () =>
										submitDecision('deny'),
									),
								]}
							>
								Deny
							</button>
						</div>
					</form>
				) : null}
				<a
					href="/"
					mix={css({
						color: colors.textMuted,
						fontSize: typography.fontSize.sm,
						textDecoration: 'none',
						'&:hover': {
							textDecoration: 'underline',
						},
					})}
				>
					Back home
				</a>
			</section>
		)
	}
}

export const Component = OAuthAuthorizeRoute

export function getMetadata() {
	return { title: 'Authorize App' }
}
