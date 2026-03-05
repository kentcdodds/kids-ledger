export const accountColorTokens = [
	'orchid',
	'ocean',
	'meadow',
	'flame',
	'sun',
	'night',
] as const

type AccountColorToken = (typeof accountColorTokens)[number]

const accountSurfaceBackgrounds: Record<AccountColorToken, string> = {
	orchid: 'color-mix(in srgb, #9541ff 14%, var(--color-surface))',
	ocean: 'color-mix(in srgb, #326dff 14%, var(--color-surface))',
	meadow: 'color-mix(in srgb, #1aa867 14%, var(--color-surface))',
	flame: 'color-mix(in srgb, #ff6a3c 14%, var(--color-surface))',
	sun: 'color-mix(in srgb, #f7b500 14%, var(--color-surface))',
	night: 'color-mix(in srgb, #3f4b66 16%, var(--color-surface))',
}

const accountGradients: Record<AccountColorToken, string> = {
	orchid: 'linear-gradient(135deg, #9541ff, #d26dff)',
	ocean: 'linear-gradient(135deg, #326dff, #42c6ff)',
	meadow: 'linear-gradient(135deg, #1aa867, #52d878)',
	flame: 'linear-gradient(135deg, #ff6a3c, #ff4d8f)',
	sun: 'linear-gradient(135deg, #f7b500, #fdd835)',
	night: 'linear-gradient(135deg, #3f4b66, #69758f)',
}

export function getAccountSurfaceBackground(colorToken: string) {
	return (
		accountSurfaceBackgrounds[colorToken as AccountColorToken] ??
		accountSurfaceBackgrounds.orchid
	)
}

export function getAccountGradientBackground(colorToken: string) {
	return accountGradients[colorToken as AccountColorToken] ?? accountGradients.orchid
}
