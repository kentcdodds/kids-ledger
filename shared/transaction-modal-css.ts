export const transactionModalCssVariables = [
	'--color-primary',
	'--color-primary-hover',
	'--color-primary-active',
	'--color-on-primary',
	'--color-primary-text',
	'--color-surface',
	'--color-text',
	'--color-text-muted',
	'--color-border',
	'--font-family',
	'--font-size-sm',
	'--font-size-base',
	'--font-size-lg',
] as const

const transactionModalCssVariableList = transactionModalCssVariables.join(', ')

const transactionModalCssBaseFieldDescription =
	"Custom CSS for a kid's transaction modal. Pass either variable declarations (automatically wrapped in :root { ... }) or a full stylesheet with selectors/@rules."

export const transactionModalCssCreateFieldDescription = `${transactionModalCssBaseFieldDescription} Supported variables: ${transactionModalCssVariableList}. Omit to use defaults.`

export const transactionModalCssUpdateFieldDescription = `${transactionModalCssBaseFieldDescription} Supported variables: ${transactionModalCssVariableList}. Omit to keep current CSS unchanged, or pass an empty string to clear saved custom CSS.`
