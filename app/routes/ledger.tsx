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

export function loader({ context }: Route.LoaderArgs) {
	// context.db // <-- this is the instance of the DB class
	// const ledger = context.db.getLedger(params.ledgerId)
	// TODO: get this from the database instead
	const ledger = { name: 'Default Ledger' }
	return { ledger }
}

export default function Ledger({ loaderData }: Route.ComponentProps) {
	return (
		<main>
			<h1>{loaderData.ledger.name}</h1>
		</main>
	)
}
