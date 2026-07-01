import { css, type Handle } from 'remix/ui'
import { colors, spacing, typography } from '#client/styles/tokens.ts'

export function ChatRoute(_handle: Handle) {
	return () => (
		<section mix={css({ display: 'grid', gap: spacing.lg })}>
			<h2
				mix={css({
					fontSize: typography.fontSize.lg,
					fontWeight: typography.fontWeight.semibold,
					margin: 0,
					color: colors.text,
				})}
			>
				Chat
			</h2>
			<p mix={css({ margin: 0, color: colors.textMuted })}>
				AI chat coming soon.
			</p>
		</section>
	)
}

export const Component = ChatRoute

export function getMetadata() {
	return { title: 'Chat' }
}
