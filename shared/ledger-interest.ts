export const monthlyInterestTransactionNote = 'Monthly interest'
export const monthlyInterestSourceType = 'monthly_interest'
export const maxApyBasisPoints = 100_000

export function formatApyLabel(apyBasisPoints: number) {
	return `${apyBasisPoints / 100}% APY`
}

export function normalizeApyBasisPoints(value: unknown) {
	if (typeof value !== 'number' || !Number.isFinite(value)) return null
	const normalized = Math.round(value)
	if (normalized < 0 || normalized > maxApyBasisPoints) return null
	return normalized
}

export function parseApyPercentToBasisPoints(value: string) {
	const numeric = Number(value)
	if (!Number.isFinite(numeric)) return null
	return normalizeApyBasisPoints(numeric * 100)
}

export function getMonthlyInterestRate(apyBasisPoints: number) {
	return (1 + apyBasisPoints / 10_000) ** (1 / 12) - 1
}

export function calculateMonthlyInterestCents(input: {
	balanceCents: number
	apyBasisPoints: number
}) {
	if (input.balanceCents <= 0) return 0
	const monthlyRate = getMonthlyInterestRate(input.apyBasisPoints)
	return Math.max(Math.round(input.balanceCents * monthlyRate), 0)
}

export function getMonthlyInterestPeriod(date: Date) {
	const year = date.getUTCFullYear()
	const month = String(date.getUTCMonth() + 1).padStart(2, '0')
	return `${year}-${month}`
}

export function getMonthlyInterestPeriodStart(period: string) {
	const match = /^(\d{4})-(\d{2})$/.exec(period)
	if (!match) {
		throw new Error('Interest period must use YYYY-MM format.')
	}
	const [, year, month] = match
	const numericMonth = Number(month)
	if (numericMonth < 1 || numericMonth > 12) {
		throw new Error('Interest period month must be between 01 and 12.')
	}
	return `${year}-${month}-01 00:00:00`
}
