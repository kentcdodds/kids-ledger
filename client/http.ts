export async function parseJsonOrNull<T = unknown>(
	response: Response,
): Promise<T | null> {
	return response.json().catch(() => null)
}

export function getErrorMessage(payload: unknown, fallback: string) {
	if (
		typeof payload === 'object' &&
		payload !== null &&
		'error' in payload &&
		typeof payload.error === 'string'
	) {
		return payload.error
	}
	return fallback
}
