export const ledgerAccountTypes = ['spending', 'savings'] as const

export type LedgerAccountType = (typeof ledgerAccountTypes)[number]

export const ledgerAccountTypeConfigs = {
	spending: {
		label: 'Spending',
		apyBasisPoints: 1_200,
	},
	savings: {
		label: 'Savings',
		apyBasisPoints: 2_400,
	},
} satisfies Record<LedgerAccountType, { label: string; apyBasisPoints: number }>

export const monthlyInterestTransactionNote = 'Monthly interest'
export const monthlyInterestSourceType = 'monthly_interest'

export function isLedgerAccountType(
	value: unknown,
): value is LedgerAccountType {
	return (
		typeof value === 'string' &&
		ledgerAccountTypes.includes(value as LedgerAccountType)
	)
}

export function normalizeLedgerAccountType(
	value: unknown,
): LedgerAccountType | null {
	if (!isLedgerAccountType(value)) return null
	return value
}

export function inferLedgerAccountTypeFromName(
	name: string,
): LedgerAccountType {
	const normalizedName = name.trim().toLowerCase()
	if (normalizedName.startsWith('save') || normalizedName.includes('saving')) {
		return 'savings'
	}
	return 'spending'
}

export function formatApyLabel(apyBasisPoints: number) {
	return `${apyBasisPoints / 100}% APY`
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
	if (!/^\d{4}-\d{2}$/.test(period)) {
		throw new Error('Interest period must use YYYY-MM format.')
	}
	return `${period}-01 00:00:00`
}
