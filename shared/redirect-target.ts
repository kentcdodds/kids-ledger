export function normalizeRedirectTarget(value: string | null) {
	if (!value) return null
	if (!value.startsWith('/')) return null
	if (value.startsWith('//')) return null
	return value
}
