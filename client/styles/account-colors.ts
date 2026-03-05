export const accountColorTokens = [
	'orchid',
	'ocean',
	'meadow',
	'flame',
	'sun',
	'night',
] as const

type AccountColorToken = (typeof accountColorTokens)[number]

const accountGradients: Record<AccountColorToken, string> = {
	orchid: 'linear-gradient(135deg, #9541ff, #d26dff)',
	ocean: 'linear-gradient(135deg, #326dff, #42c6ff)',
	meadow: 'linear-gradient(135deg, #1aa867, #52d878)',
	flame: 'linear-gradient(135deg, #ff6a3c, #ff4d8f)',
	sun: 'linear-gradient(135deg, #f7b500, #fdd835)',
	night: 'linear-gradient(135deg, #3f4b66, #69758f)',
}

export function getAccountGradientBackground(colorToken: string) {
	return (
		accountGradients[colorToken as AccountColorToken] ?? accountGradients.orchid
	)
}
