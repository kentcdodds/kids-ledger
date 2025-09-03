import { invariantResponse } from '@epic-web/invariant'
import type { Route } from './+types/ledger'

export function meta({ loaderData }: Route.MetaArgs) {
	return [
		{ title: loaderData.ledger.name },
		{
			name: 'description',
			content: `View and edit the ${loaderData.ledger.name} ledger`,
		},
	]
}

export async function loader({ context, params }: Route.LoaderArgs) {
	const ledger = await context.db.getLedger(params.ledgerId)
	invariantResponse(ledger, 'Ledger not found', { status: 404 })
	return { ledger }
}

export default function Ledger({ loaderData }: Route.ComponentProps) {
	return (
		<main>
			<h1>{loaderData.ledger.name}</h1>
		</main>
	)
}
