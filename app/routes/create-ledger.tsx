import { Form, useNavigate, redirect } from 'react-router'
import type { Route } from './+types/create-ledger'

export function meta({}: Route.MetaArgs) {
	return [
		{ title: 'Create New Ledger - Kids Ledger' },
		{ name: 'description', content: 'Create a new ledger to track your kids expenses' },
	]
}

export async function action({ context, request }: Route.ActionArgs) {
	const formData = await request.formData()
	const name = formData.get('name') as string

	if (!name?.trim()) {
		return { error: 'Ledger name is required' }
	}

	try {
		const ledger = await context.db.createLedger({ name: name.trim() })
		return redirect(`/ledger/${ledger.id}`)
	} catch (error) {
		return { error: 'Failed to create ledger' }
	}
}

export default function CreateLedger() {
	const navigate = useNavigate()

	return (
		<div className="min-h-screen bg-background">
			<div className="container mx-auto px-4 py-8">
				{/* Header */}
				<div className="mb-8">
					<button
						onClick={() => navigate('/')}
						className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
					>
						<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
						</svg>
						Back to Home
					</button>
					<h1 className="text-h2 font-bold text-foreground">Create New Ledger</h1>
					<p className="text-muted-foreground mt-2">
						Start tracking your kids' expenses with a new ledger
					</p>
				</div>

				{/* Form */}
				<div className="max-w-md mx-auto">
					<Form method="post" className="space-y-6">
						<div>
							<label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
								Ledger Name
							</label>
							<input
								type="text"
								id="name"
								name="name"
								required
								placeholder="e.g., Family Expenses 2024"
								className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
							/>
						</div>

						<button
							type="submit"
							className="w-full bg-primary text-primary-foreground font-semibold py-3 px-6 rounded-lg hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
						>
							Create Ledger
						</button>
					</Form>
				</div>
			</div>
		</div>
	)
}