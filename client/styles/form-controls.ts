import { colors, radius, spacing } from '#client/styles/tokens.ts'

export const inputCss = {
	padding: spacing.sm,
	borderRadius: radius.md,
	border: `1px solid ${colors.border}`,
	backgroundColor: colors.surface,
	color: colors.text,
}

export const buttonCss = {
	padding: `${spacing.sm} ${spacing.md}`,
	borderRadius: radius.md,
	border: 'none',
	backgroundColor: colors.primary,
	color: colors.onPrimary,
	cursor: 'pointer',
}
