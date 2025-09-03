import { Form, useNavigate, redirect, useActionData } from 'react-router'
import { z } from 'zod'
import { useState } from 'react'
import { ErrorDisplay } from '../components/error-display'
import {
	createError,
	handleZodError,
	handleDatabaseError,
	handleUnknownError,
	logError,
} from '../utils/error-handling'
import type { Route } from './+types/create-ledger'

const createLedgerSchema = z.object({
	name: z
		.string()
		.min(1, 'Ledger name is required')
		.trim()
		.min(1, 'Ledger name cannot be empty'),
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
	try {
		const formData = await request.formData()
		const rawData = {
			name: formData.get('name'),
		}

		// Validate input
		const result = createLedgerSchema.safeParse(rawData)
		if (!result.success) {
			const error = handleZodError(result.error, 'CreateLedger')
			return { error }
		}

		// Create ledger
		const ledger = await context.db.createLedger(result.data)
		logError(
			createError(
				'unknown',
				'Ledger created successfully',
				`Ledger ID: ${ledger.id}`,
				'SUCCESS',
			),
			'CreateLedger',
		)
		return redirect(`/ledger/${ledger.id}`)
	} catch (error) {
		// Handle database errors
		if (
			error instanceof Error &&
			error.message.includes('Failed to create ledger')
		) {
			const appError = handleDatabaseError(error, 'CreateLedger')
			return { error: appError }
		}

		// Handle unknown errors
		const appError = handleUnknownError(error, 'CreateLedger')
		return { error: appError }
	}
}

export default function CreateLedger() {
	const navigate = useNavigate()
	const actionData = useActionData<{ error?: any }>()
	const [error, setError] = useState(actionData?.error || null)

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

				{/* Error Display */}
				<ErrorDisplay error={error} onDismiss={() => setError(null)} />

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
							<p className="text-muted-foreground mt-1 text-xs">
								Choose a name that helps you identify this ledger
							</p>
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
