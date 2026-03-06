import { parseSafe, type Schema } from 'remix/data-schema'

type ParseJsonBodyResult<Output> =
	| { ok: true; value: Output }
	| { ok: false; error: 'invalid_json' | 'invalid_body' }

export async function parseJsonBody<Output>(
	request: Request,
	schema: Schema<unknown, Output>,
): Promise<ParseJsonBodyResult<Output>> {
	let body: unknown
	try {
		body = await request.json()
	} catch {
		return { ok: false, error: 'invalid_json' }
	}
	const parsed = parseSafe(schema, body)
	if (!parsed.success) {
		return { ok: false, error: 'invalid_body' }
	}
	return { ok: true, value: parsed.value }
}
