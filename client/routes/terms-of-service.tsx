import { type Handle } from 'remix/component'
import { colors, spacing, typography } from '#client/styles/tokens.ts'

export function TermsOfServiceRoute(handle: Handle) {
	void handle

	return () => (
		<section css={{ display: 'grid', gap: spacing.md }}>
			<h1
				css={{
					margin: 0,
					fontSize: typography.fontSize.xl,
					color: colors.text,
				}}
			>
				Terms of Service
			</h1>
			<p css={{ margin: 0, color: colors.textMuted }}>
				Kids Ledger is provided as-is, with no guarantees, uptime commitments,
				or other service-level agreement.
			</p>
			<p css={{ margin: 0, color: colors.textMuted }}>
				Data may be lost or removed at any time. Do not rely on this app as your
				only record of important information.
			</p>
			<p css={{ margin: 0, color: colors.textMuted }}>
				I do not plan to inspect user data, but this is not designed to provide
				high-assurance privacy protections.
			</p>
		</section>
	)
}

export const Component = TermsOfServiceRoute

export function getMetadata() {
	return { title: 'Terms of Service' }
}
