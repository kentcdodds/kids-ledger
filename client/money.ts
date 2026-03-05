const usdFormatter = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD',
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
})

export function formatCents(cents: number) {
	return usdFormatter.format(cents / 100)
}

export function parseAmountToCents(rawAmount: string) {
	const value = Number(rawAmount)
	if (!Number.isFinite(value)) return null
	return Math.round(value * 100)
}
