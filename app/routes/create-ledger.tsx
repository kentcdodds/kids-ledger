import { Form, useNavigate, redirect } from 'react-router'
import { z } from 'zod'
import type { Route } from './+types/create-ledger'

const createLedgerSchema = z.object({
	name: z.string().min(1, 'Ledger name is required').trim(),
})

export function meta({}: Route.MetaArgs) {
	return [
		{ title: 'Create New Ledger - Kids Ledger' },
		{
			name: 'description',
			content: 'Create a new ledger to track your kids account balances',
		},
	]
}

export async function action({ context, request }: Route.ActionArgs) {
	const formData = await request.formData()
	const rawData = {
		name: formData.get('name'),
	}

	const result = createLedgerSchema.safeParse(rawData)
	if (!result.success) {
		return { error: 'Ledger name is required' }
	}

	try {
		const ledger = await context.db.createLedger(result.data)
		return redirect(`/ledger/${ledger.id}`)
	} catch (error) {
		return { error: 'Failed to create ledger' }
	}
}

export default function CreateLedger() {
	const navigate = useNavigate()

	return (
		<div className="bg-background min-h-screen">
			<div className="container mx-auto px-4 py-8">
				{/* Header */}
				<div className="mb-8">
					<button
						onClick={() => navigate('/')}
						className="text-muted-foreground hover:text-foreground mb-4 flex items-center gap-2 transition-colors"
					>
						<svg
							className="h-5 w-5"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M15 19l-7-7 7-7"
							/>
						</svg>
						Back to Home
					</button>
					<h1 className="text-h2 text-foreground font-bold">
						Create New Ledger
					</h1>
					<p className="text-muted-foreground mt-2">
						Start tracking your kids' account balances with a new ledger
					</p>
				</div>

				{/* Form */}
				<div className="mx-auto max-w-md">
					<Form method="post" className="space-y-6">
						<div>
							<label
								htmlFor="name"
								className="text-foreground mb-2 block text-sm font-medium"
							>
								Ledger Name
							</label>
							<input
								type="text"
								id="name"
								name="name"
								required
								placeholder="e.g., Family Accounts 2024"
								className="border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded-lg border px-4 py-3 focus:border-transparent focus:ring-2 focus:outline-none"
							/>
						</div>

						<button
							type="submit"
							className="bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-ring w-full rounded-lg px-6 py-3 font-semibold transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none"
						>
							Create Ledger
						</button>
					</Form>
				</div>
			</div>
		</div>
	)
}
