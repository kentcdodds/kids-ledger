import { css, type Handle } from 'remix/ui'
import { readAppSession } from '#client/app-session.tsx'
import { colors, spacing, typography } from '#client/styles/tokens.ts'
import { buttonCss } from '#client/styles/form-controls.ts'

export function AccountRoute(handle: Handle) {
	return () => {
		const email = readAppSession(handle).session?.email ?? ''

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
			</section>
		)
	}
}

export const Component = AccountRoute
