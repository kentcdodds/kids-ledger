import { type Handle } from 'remix/component'
import { requireSessionOrRedirect } from '#client/session.ts'
import { colors, spacing, typography } from '#client/styles/tokens.ts'
import { buttonCss } from '#client/styles/form-controls.ts'

type AccountStatus = 'idle' | 'loading' | 'ready' | 'error'

export function AccountRoute(handle: Handle) {
	let status: AccountStatus = 'loading'
	let email = ''
	let message: string | null = null

	async function loadAccount(signal: AbortSignal) {
		try {
			const session = await requireSessionOrRedirect(signal)
			if (signal.aborted || !session) return
			email = session.email
			status = 'ready'
			message = null
			handle.update()
		} catch {
			if (signal.aborted) return
			status = 'error'
			message = 'Unable to load your account.'
			handle.update()
		}
	}

	return () => {
		if (status === 'loading') {
			handle.queueTask(loadAccount)
		}

		return (
			<section
				css={{
					maxWidth: '28rem',
					margin: '0 auto',
					display: 'grid',
					gap: spacing.lg,
				}}
			>
				<header css={{ display: 'grid', gap: spacing.xs }}>
					<h1
						css={{
							fontSize: typography.fontSize.xl,
							fontWeight: typography.fontWeight.semibold,
							color: colors.text,
							margin: 0,
						}}
					>
						{email ? `Welcome, ${email}` : 'Welcome'}
					</h1>
					<p css={{ color: colors.textMuted }}>
						You are signed in to kids-ledger.
					</p>
				</header>
				{status === 'loading' ? (
					<p css={{ color: colors.textMuted }}>Loading your account…</p>
				) : null}
				{message ? (
					<p css={{ color: colors.error }} role="alert">
						{message}
					</p>
				) : null}
				{status === 'ready' ? (
					<form method="post" action="/logout">
						<button
							type="submit"
							css={{
								...buttonCss,
								backgroundColor: colors.surface,
								color: colors.text,
								border: `2px solid ${colors.border}`,
								boxShadow: `0 2px 0 0 ${colors.border}`,
								'&:active': {
									transform: 'translateY(2px)',
									boxShadow: `0 0 0 0 ${colors.border}`,
								},
							}}
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
