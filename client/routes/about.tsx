import { type Handle } from 'remix/component'
import { colors, spacing, typography } from '#client/styles/tokens.ts'

export function AboutRoute(handle: Handle) {
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
				About
			</h1>
			<p css={{ margin: 0, color: colors.textMuted }}>
				Kids Ledger is a small family project for tracking chores, spending, and
				saving in a way kids can understand.
			</p>
			<p css={{ margin: 0, color: colors.textMuted }}>
				It is made with ❤️ by Dad and built to be practical, lightweight, and
				fun.
			</p>
		</section>
	)
}

export const Component = AboutRoute

export function getMetadata() {
	return { title: 'About' }
}
