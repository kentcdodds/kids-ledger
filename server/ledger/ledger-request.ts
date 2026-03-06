import { type Schema } from 'remix/data-schema'
import { readAuthSession } from '#server/auth-session.ts'
import { createLedgerService } from '#server/ledger/ledger-service.ts'
import { parseJsonBody as parseJsonRequestBody } from '#server/request-parsing.ts'
import { type AppEnv } from '#types/env-schema.ts'

export async function readLedgerService(request: Request, appEnv: AppEnv) {
	const session = await readAuthSession(request)
	if (!session) {
		return {
			ok: false as const,
			response: jsonResponse({ error: 'Unauthorized.' }, 401),
		}
	}
	const userId = Number(session.id)
	if (!Number.isInteger(userId) || userId <= 0) {
		return {
			ok: false as const,
			response: jsonResponse({ error: 'Invalid session.' }, 401),
		}
	}
	return {
		ok: true as const,
		service: createLedgerService(appEnv.APP_DB, userId),
	}
}

export async function parseJsonBody<Output>(
	request: Request,
	schema: Schema<unknown, Output>,
) {
	const parsed = await parseJsonRequestBody(request, schema)
	if (!parsed.ok && parsed.error === 'invalid_json') {
		return {
			ok: false as const,
			response: jsonResponse({ error: 'Invalid JSON payload.' }, 400),
		}
	}
	if (!parsed.ok) {
		return {
			ok: false as const,
			response: jsonResponse({ error: 'Invalid request body.' }, 400),
		}
	}
	return {
		ok: true as const,
		value: parsed.value,
	}
}

export function jsonResponse(payload: unknown, status = 200) {
	return new Response(JSON.stringify(payload), {
		status,
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': 'no-store',
		},
	})
}
