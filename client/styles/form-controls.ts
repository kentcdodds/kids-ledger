import { colors, radius, spacing } from '#client/styles/tokens.ts'

export const inputCss = {
	padding: spacing.sm,
	borderRadius: radius.md,
	border: `2px solid ${colors.border}`,
	backgroundColor: colors.surface,
	color: colors.text,
	boxShadow: `inset 0 2px 4px rgba(0,0,0,0.05)`,
	transition: 'all 0.2s ease',
	outline: 'none',
	width: '100%',
	minWidth: 0,
	'&:focus': {
		borderColor: colors.primary,
		boxShadow: `0 0 0 4px ${colors.primarySoft}`,
	},
}

export const buttonCss = {
	padding: `${spacing.sm} ${spacing.md}`,
	borderRadius: radius.md,
	border: 'none',
	backgroundColor: colors.primary,
	color: colors.onPrimary,
	cursor: 'pointer',
	boxShadow: `0 4px 0 0 ${colors.primaryActive}`,
	transition: 'all 0.1s ease',
	fontWeight: 'bold',
	'&:active': {
		transform: 'translateY(4px)',
		boxShadow: `0 0 0 0 ${colors.primaryActive}`,
	},
}
