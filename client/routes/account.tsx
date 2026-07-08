import { css, type Handle } from 'remix/ui'
import { fetchSessionInfo, requireSessionOrRedirect } from '#client/session.ts'
import {
	tryConsumeRouteLoaderData,
	type ClientRouteLoader,
} from '#client/route-loader-data.tsx'
import { readRouterUrl } from '#client/router-location.tsx'
import { colors, spacing, typography } from '#client/styles/tokens.ts'
import { buttonCss } from '#client/styles/form-controls.ts'

type AccountStatus = 'idle' | 'loading' | 'ready' | 'error'

export const loader: ClientRouteLoader = async ({ signal }) => {
	return { accountSession: await fetchSessionInfo(signal) }
}

export function AccountRoute(handle: Handle) {
	let status: AccountStatus = 'loading'
	let email = ''
	let message: string | null = null
	let accountRefreshInFlight = false

	function applySession(session: Awaited<ReturnType<typeof fetchSessionInfo>>) {
		if (!session) return false
		email = session.email
		status = 'ready'
		message = null
		return true
	}

	function applyRouteLoaderData(currentHref: string) {
		const session = tryConsumeRouteLoaderData(
			handle,
			'accountSession',
			currentHref,
		)
		if (session === undefined) return false
		if (applySession(session)) return true
		if (typeof window !== 'undefined') {
			window.location.assign('/login?redirectTo=/account')
		}
		return true
	}

	async function loadAccount(signal: AbortSignal) {
		if (accountRefreshInFlight) return
		accountRefreshInFlight = true
		try {
			const session = await requireSessionOrRedirect(signal)
			if (signal.aborted || !session) return
			applySession(session)
			handle.update()
		} catch {
			if (signal.aborted) return
			status = 'error'
			message = 'Unable to load your account.'
			handle.update()
		} finally {
			accountRefreshInFlight = false
		}
	}

	return () => {
		const currentHref = readRouterUrl(handle)
		const appliedRouteData = applyRouteLoaderData(currentHref)
		if (status === 'loading' && !appliedRouteData && !accountRefreshInFlight) {
			handle.queueTask(loadAccount)
		}

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
					<h1
						mix={css({
							fontSize: typography.fontSize.xl,
							fontWeight: typography.fontWeight.semibold,
							color: colors.text,
							margin: 0,
						})}
					>
						{email ? `Welcome, ${email}` : 'Welcome'}
					</h1>
					<p mix={css({ color: colors.textMuted })}>
						You are signed in to kids-ledger.
					</p>
				</header>
				{status === 'loading' ? (
					<p mix={css({ color: colors.textMuted })}>Loading your account…</p>
				) : null}
				{message ? (
					<p mix={css({ color: colors.error })} role="alert">
						{message}
					</p>
				) : null}
				{status === 'ready' ? (
					<form method="post" action="/logout">
						<button
							type="submit"
							mix={css({
								...buttonCss,
								backgroundColor: colors.surface,
								color: colors.text,
								border: `2px solid ${colors.border}`,
								boxShadow: `0 2px 0 0 ${colors.border}`,
								'&:active': {
									transform: 'translateY(2px)',
									boxShadow: `0 0 0 0 ${colors.border}`,
								},
							})}
						>
							Log out
						</button>
					</form>
				) : null}
			</section>
		)
	}
}

export const Component = AccountRoute

export function getMetadata() {
	return { title: 'Account' }
}
