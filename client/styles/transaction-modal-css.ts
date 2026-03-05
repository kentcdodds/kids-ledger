function isLikelyCssStylesheet(cssText: string) {
	return cssText.includes('{') || cssText.includes('@')
}

export function buildTransactionModalCss(transactionModalCss: string) {
	const trimmed = transactionModalCss.trim()
	if (!trimmed) return ''
	if (isLikelyCssStylesheet(trimmed)) return trimmed
	return `:root {\n${trimmed}\n}`
}
