import { createLedgerService } from '#server/ledger/ledger-service.ts'
import { createDb, usersTable } from '#worker/db.ts'
import { type MCP } from '#mcp/index.ts'

export async function createLedgerServiceForAgent(agent: MCP) {
	const email = agent.getUserEmail()
	const appDb = agent.getDatabase()
	const db = createDb(appDb)
	const user = await db.findOne(usersTable, { where: { email } })
	if (!user) {
		throw new Error('No matching user found for MCP access.')
	}
	return createLedgerService(appDb, user.id)
}

export function successContent(title: string, details: string) {
	return {
		content: [
			{
				type: 'text' as const,
				text: `## ${title}\n\n${details}`,
			},
		],
	}
}
