function isLikelyCssStylesheet(cssText: string) {
	let inSingleQuote = false
	let inDoubleQuote = false
	let inComment = false
	let hasStatementText = false

	for (let index = 0; index < cssText.length; index += 1) {
		const char = cssText[index]
		const next = cssText[index + 1]

		if (inComment) {
			if (char === '*' && next === '/') {
				inComment = false
				index += 1
			}
			continue
		}

		if (inSingleQuote) {
			if (char === '\\') {
				index += 1
				continue
			}
			if (char === "'") {
				inSingleQuote = false
			}
			continue
		}

		if (inDoubleQuote) {
			if (char === '\\') {
				index += 1
				continue
			}
			if (char === '"') {
				inDoubleQuote = false
			}
			continue
		}

		if (char === '/' && next === '*') {
			inComment = true
			index += 1
			continue
		}

		if (char === "'") {
			inSingleQuote = true
			continue
		}

		if (char === '"') {
			inDoubleQuote = true
			continue
		}

		if (char === ';' || char === '}') {
			hasStatementText = false
			continue
		}

		if (char === '{') return true

		if (!hasStatementText) {
			if (char === '@') return true
			if (char?.trim()) {
				hasStatementText = true
			}
		}
	}

	return false
}

export function buildTransactionModalCss(transactionModalCss: string) {
	const trimmed = transactionModalCss.trim()
	if (!trimmed) return ''
	const sanitized = trimmed.replace(/<\/style/gi, '<\\/style')
	if (isLikelyCssStylesheet(sanitized)) return sanitized
	return `:root {\n${sanitized}\n}`
}
