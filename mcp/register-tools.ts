import { type MCP } from './index.ts'
import { registerLedgerTools } from './tools/ledger-tools.ts'
import { registerDoMathTool } from './tools/do-math.ts'
import { registerOpenCalculatorUiTool } from './tools/open-calculator-ui.ts'

export async function registerTools(agent: MCP) {
	await registerLedgerTools(agent)
	await registerDoMathTool(agent)
	await registerOpenCalculatorUiTool(agent)
}
