import { type Handle } from 'remix/component'
import { colors, spacing, typography } from '#client/styles/tokens.ts'

export function PrivacyPolicyRoute(handle: Handle) {
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
				Privacy Policy
			</h1>
			<p css={{ margin: 0, color: colors.textMuted }}>
				This is a personal family project, not a commercial service, and there
				is no service-level agreement.
			</p>
			<p css={{ margin: 0, color: colors.textMuted }}>
				I do not plan to look at anyone&apos;s data, but you should not expect
				enterprise-grade privacy controls.
			</p>
			<p css={{ margin: 0, color: colors.textMuted }}>
				Data could disappear at any time, so please keep your own backups of
				anything important.
			</p>
		</section>
	)
}

export const Component = PrivacyPolicyRoute

export function getMetadata() {
	return { title: 'Privacy Policy' }
}
