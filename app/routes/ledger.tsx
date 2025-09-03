import { invariantResponse } from '@epic-web/invariant'
import { Form, useFetcher, useNavigate, useActionData } from 'react-router'
import { useState, useRef, useEffect } from 'react'
import { z } from 'zod'
import { ErrorDisplay } from '../components/error-display'
import {
	createError,
	handleZodError,
	handleDatabaseError,
	handleUnknownError,
	logError,
} from '../utils/error-handling'
import type { Route } from './+types/ledger'

// Zod schemas for validation
const createKidSchema = z.object({
	ledgerId: z.string().min(1, 'Ledger ID is required'),
	name: z
		.string()
		.min(1, 'Name is required')
		.trim()
		.min(1, 'Name cannot be empty'),
	emoji: z.string().min(1, 'Emoji is required').min(1, 'Emoji cannot be empty'),
})

const updateKidSchema = z.object({
	id: z.coerce.number().positive('Invalid kid ID'),
	name: z
		.string()
		.min(1, 'Name is required')
		.trim()
		.min(1, 'Name cannot be empty'),
	emoji: z.string().min(1, 'Emoji is required').min(1, 'Emoji cannot be empty'),
})

const deleteKidSchema = z.object({
	id: z.coerce.number().positive('Invalid kid ID'),
})

const reorderKidSchema = z.object({
	id: z.coerce.number().positive('Invalid kid ID'),
	beforeId: z.string().optional(),
	afterId: z.string().optional(),
})

const createAccountSchema = z.object({
	kidId: z.coerce.number().positive('Invalid kid ID'),
	name: z
		.string()
		.min(1, 'Account name is required')
		.trim()
		.min(1, 'Account name cannot be empty'),
	balance: z.coerce.number().default(0),
})

const updateAccountSchema = z.object({
	id: z.coerce.number().positive('Invalid account ID'),
	name: z
		.string()
		.min(1, 'Account name is required')
		.trim()
		.min(1, 'Account name cannot be empty'),
})

const deleteAccountSchema = z.object({
	id: z.coerce.number().positive('Invalid account ID'),
})

const updateBalanceSchema = z.object({
	id: z.coerce.number().positive('Invalid account ID'),
	amount: z.coerce.number().positive('Amount must be positive'),
	operation: z.enum(['add', 'remove'], {
		errorMap: () => ({ message: 'Operation must be either "add" or "remove"' }),
	}),
})

const reorderAccountSchema = z.object({
	id: z.coerce.number().positive('Invalid account ID'),
	beforeId: z.string().optional(),
	afterId: z.string().optional(),
})

export function meta({ loaderData }: Route.MetaArgs) {
	return [
		{ title: loaderData.ledger.ledger.name },
		{
			name: 'description',
			content: `View and edit the ${loaderData.ledger.ledger.name} ledger`,
		},
	]
}

export async function loader({ context, params }: Route.LoaderArgs) {
	try {
		const ledger = await context.db.getFullLedger(params.ledgerId)
		invariantResponse(ledger, 'Ledger not found', { status: 404 })
		return { ledger }
	} catch (error) {
		logError(handleUnknownError(error, 'LedgerLoader'), 'LedgerLoader')
		throw error
	}
}

// Action handlers for all CRUD operations
export async function action({ context, request }: Route.ActionArgs) {
	try {
		const formData = await request.formData()
		const intent = formData.get('intent')

		if (!intent) {
			const error = createError(
				'validation',
				'Missing intent',
				'No action specified',
				'MISSING_INTENT',
			)
			logError(error, 'LedgerAction')
			return { error }
		}

		switch (intent) {
			case 'create-kid': {
				const rawData = {
					ledgerId: formData.get('ledgerId'),
					name: formData.get('name'),
					emoji: formData.get('emoji'),
				}

				const result = createKidSchema.safeParse(rawData)
				if (!result.success) {
					const error = handleZodError(result.error, 'CreateKid')
					return { error }
				}

				try {
					await context.db.createKid(result.data)
					logError(
						createError(
							'unknown',
							'Kid created successfully',
							`Kid: ${result.data.name}`,
							'SUCCESS',
						),
						'CreateKid',
					)
					return { success: true }
				} catch (dbError) {
					const error = handleDatabaseError(dbError, 'CreateKid')
					return { error }
				}
			}

			case 'update-kid': {
				const rawData = {
					id: formData.get('id'),
					name: formData.get('name'),
					emoji: formData.get('emoji'),
				}

				const result = updateKidSchema.safeParse(rawData)
				if (!result.success) {
					const error = handleZodError(result.error, 'UpdateKid')
					return { error }
				}

				try {
					await context.db.updateKid(result.data.id, {
						name: result.data.name,
						emoji: result.data.emoji,
					})
					logError(
						createError(
							'unknown',
							'Kid updated successfully',
							`Kid ID: ${result.data.id}`,
							'SUCCESS',
						),
						'UpdateKid',
					)
					return { success: true }
				} catch (dbError) {
					const error = handleDatabaseError(dbError, 'UpdateKid')
					return { error }
				}
			}

			case 'delete-kid': {
				const rawData = { id: formData.get('id') }
				const result = deleteKidSchema.safeParse(rawData)
				if (!result.success) {
					const error = handleZodError(result.error, 'DeleteKid')
					return { error }
				}

				try {
					await context.db.deleteKid(result.data.id)
					logError(
						createError(
							'unknown',
							'Kid deleted successfully',
							`Kid ID: ${result.data.id}`,
							'SUCCESS',
						),
						'DeleteKid',
					)
					return { success: true }
				} catch (dbError) {
					const error = handleDatabaseError(dbError, 'DeleteKid')
					return { error }
				}
			}

			case 'reorder-kid': {
				const rawData = {
					id: formData.get('id'),
					beforeId: formData.get('beforeId'),
					afterId: formData.get('afterId'),
				}

				const result = reorderKidSchema.safeParse(rawData)
				if (!result.success) {
					const error = handleZodError(result.error, 'ReorderKid')
					return { error }
				}

				try {
					await context.db.reorderKidBetween(
						result.data.id,
						result.data.beforeId ? parseInt(result.data.beforeId) : null,
						result.data.afterId ? parseInt(result.data.afterId) : null,
					)
					logError(
						createError(
							'unknown',
							'Kid reordered successfully',
							`Kid ID: ${result.data.id}`,
							'SUCCESS',
						),
						'ReorderKid',
					)
					return { success: true }
				} catch (dbError) {
					const error = handleDatabaseError(dbError, 'ReorderKid')
					return { error }
				}
			}

			case 'create-account': {
				const rawData = {
					kidId: formData.get('kidId'),
					name: formData.get('name'),
					balance: formData.get('balance'),
				}

				const result = createAccountSchema.safeParse(rawData)
				if (!result.success) {
					const error = handleZodError(result.error, 'CreateAccount')
					return { error }
				}

				try {
					await context.db.createAccount(result.data)
					logError(
						createError(
							'unknown',
							'Account created successfully',
							`Account: ${result.data.name}`,
							'SUCCESS',
						),
						'CreateAccount',
					)
					return { success: true }
				} catch (dbError) {
					const error = handleDatabaseError(dbError, 'CreateAccount')
					return { error }
				}
			}

			case 'update-account': {
				const rawData = {
					id: formData.get('id'),
					name: formData.get('name'),
				}

				const result = updateAccountSchema.safeParse(rawData)
				if (!result.success) {
					const error = handleZodError(result.error, 'UpdateAccount')
					return { error }
				}

				try {
					await context.db.updateAccount(result.data.id, {
						name: result.data.name,
					})
					logError(
						createError(
							'unknown',
							'Account updated successfully',
							`Account ID: ${result.data.id}`,
							'SUCCESS',
						),
						'UpdateAccount',
					)
					return { success: true }
				} catch (dbError) {
					const error = handleDatabaseError(dbError, 'UpdateAccount')
					return { error }
				}
			}

			case 'delete-account': {
				const rawData = { id: formData.get('id') }
				const result = deleteAccountSchema.safeParse(rawData)
				if (!result.success) {
					const error = handleZodError(result.error, 'DeleteAccount')
					return { error }
				}

				try {
					await context.db.deleteAccount(result.data.id)
					logError(
						createError(
							'unknown',
							'Account deleted successfully',
							`Account ID: ${result.data.id}`,
							'SUCCESS',
						),
						'DeleteAccount',
					)
					return { success: true }
				} catch (dbError) {
					const error = handleDatabaseError(dbError, 'DeleteAccount')
					return { error }
				}
			}

			case 'update-balance': {
				const rawData = {
					id: formData.get('id'),
					amount: formData.get('amount'),
					operation: formData.get('operation'),
				}

				const result = updateBalanceSchema.safeParse(rawData)
				if (!result.success) {
					const error = handleZodError(result.error, 'UpdateBalance')
					return { error }
				}

				try {
					const account = await context.db.getAccount(result.data.id)
					if (!account) {
						const error = createError(
							'database',
							'Account not found',
							`Account ID: ${result.data.id} does not exist`,
							'ACCOUNT_NOT_FOUND',
						)
						logError(error, 'UpdateBalance')
						return { error }
					}

					const newBalance =
						result.data.operation === 'add'
							? account.balance + result.data.amount
							: account.balance - result.data.amount

					await context.db.updateAccount(result.data.id, {
						balance: newBalance,
					})
					logError(
						createError(
							'unknown',
							'Balance updated successfully',
							`Account: ${account.name}, New balance: $${newBalance.toFixed(2)}`,
							'SUCCESS',
						),
						'UpdateBalance',
					)
					return { success: true }
				} catch (dbError) {
					const error = handleDatabaseError(dbError, 'UpdateBalance')
					return { error }
				}
			}

			case 'reorder-account': {
				const rawData = {
					id: formData.get('id'),
					beforeId: formData.get('beforeId'),
					afterId: formData.get('afterId'),
				}

				const result = reorderAccountSchema.safeParse(rawData)
				if (!result.success) {
					const error = handleZodError(result.error, 'ReorderAccount')
					return { error }
				}

				try {
					await context.db.reorderAccountBetween(
						result.data.id,
						result.data.beforeId ? parseInt(result.data.beforeId) : null,
						result.data.afterId ? parseInt(result.data.afterId) : null,
					)
					logError(
						createError(
							'unknown',
							'Account reordered successfully',
							`Account ID: ${result.data.id}`,
							'SUCCESS',
						),
						'ReorderAccount',
					)
					return { success: true }
				} catch (dbError) {
					const error = handleDatabaseError(dbError, 'ReorderAccount')
					return { error }
				}
			}

			default: {
				const error = createError(
					'validation',
					'Invalid action',
					`Unknown intent: ${intent}`,
					'INVALID_INTENT',
				)
				logError(error, 'LedgerAction')
				return { error }
			}
		}
	} catch (error) {
		const appError = handleUnknownError(error, 'LedgerAction')
		return { error: appError }
	}
}

// Drag and Drop Components
function DraggableKid({
	kid,
	onReorder,
}: {
	kid: any
	onReorder: (beforeId: number | null, afterId: number | null) => void
}) {
	const [isDragging, setIsDragging] = useState(false)
	const [isEditing, setIsEditing] = useState(false)
	const [isAddingAccount, setIsAddingAccount] = useState(false)
	const [error, setError] = useState<any>(null)
	const fetcher = useFetcher()
	const dragRef = useRef<HTMLDivElement>(null)

	// Handle fetcher errors
	useEffect(() => {
		if (fetcher.data?.error) {
			setError(fetcher.data.error)
		}
	}, [fetcher.data])

	function handleDragStart(e: React.DragEvent) {
		setIsDragging(true)
		e.dataTransfer.setData('text/plain', kid.id.toString())
		e.dataTransfer.effectAllowed = 'move'
	}

	function handleDragEnd() {
		setIsDragging(false)
	}

	function handleDrop(e: React.DragEvent) {
		e.preventDefault()
		const draggedId = parseInt(e.dataTransfer.getData('text/plain'))
		if (draggedId === kid.id) return

		// Find the position to insert
		const rect = dragRef.current?.getBoundingClientRect()
		if (!rect) return

		const dropY = e.clientY
		const isAfter = dropY > rect.top + rect.height / 2

		// Get all kids to determine before/after
		const kids = Array.from(document.querySelectorAll('[data-kid-id]'))
		const currentIndex = kids.findIndex(
			(el) => el.getAttribute('data-kid-id') === kid.id.toString(),
		)
		const draggedIndex = kids.findIndex(
			(el) => el.getAttribute('data-kid-id') === draggedId.toString(),
		)

		let beforeId: number | null = null
		let afterId: number | null = null

		if (draggedIndex < currentIndex) {
			// Dragging from earlier to later
			if (isAfter) {
				const nextKid = kids[currentIndex + 1]
				afterId = nextKid
					? parseInt(nextKid.getAttribute('data-kid-id') || '0')
					: null
			} else {
				const currentKid = kids[currentIndex]
				beforeId = currentKid
					? parseInt(currentKid.getAttribute('data-kid-id') || '0')
					: null
			}
		} else {
			// Dragging from later to earlier
			if (isAfter) {
				const nextKid = kids[currentIndex + 1]
				afterId = nextKid
					? parseInt(nextKid.getAttribute('data-kid-id') || '0')
					: null
			} else {
				const prevKid = kids[currentIndex - 1]
				beforeId = prevKid
					? parseInt(prevKid.getAttribute('data-kid-id') || '0')
					: null
			}
		}

		onReorder(beforeId, afterId)
	}

	function handleDragOver(e: React.DragEvent) {
		e.preventDefault()
		e.dataTransfer.dropEffect = 'move'
	}

	return (
		<div
			ref={dragRef}
			data-kid-id={kid.id}
			draggable
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
			onDrop={handleDrop}
			onDragOver={handleDragOver}
			className={`bg-card border-border mb-4 rounded-lg border p-4 transition-all ${
				isDragging ? 'scale-95 opacity-50' : ''
			}`}
		>
			{/* Error Display */}
			<ErrorDisplay error={error} onDismiss={() => setError(null)} />

			{/* Kid Header */}
			<div className="mb-4 flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div className="bg-accent/10 flex h-10 w-10 items-center justify-center rounded-full text-xl">
						{isEditing ? (
							<input
								type="text"
								defaultValue={kid.emoji}
								className="h-8 w-8 border-none bg-transparent text-center outline-none"
								onBlur={(e) => {
									fetcher.submit(
										{
											intent: 'update-kid',
											id: kid.id.toString(),
											name: kid.name,
											emoji: e.target.value,
										},
										{ method: 'post' },
									)
									setIsEditing(false)
								}}
								onKeyDown={(e) => {
									if (e.key === 'Enter') {
										e.currentTarget.blur()
									}
								}}
							/>
						) : (
							<span
								onClick={() => setIsEditing(true)}
								className="cursor-pointer"
							>
								{kid.emoji}
							</span>
						)}
					</div>
					<div>
						{isEditing ? (
							<input
								type="text"
								defaultValue={kid.name}
								className="text-h5 border-none bg-transparent font-semibold outline-none"
								onBlur={(e) => {
									fetcher.submit(
										{
											intent: 'update-kid',
											id: kid.id.toString(),
											name: e.target.value,
											emoji: kid.emoji,
										},
										{ method: 'post' },
									)
									setIsEditing(false)
								}}
								onKeyDown={(e) => {
									if (e.key === 'Enter') {
										e.currentTarget.blur()
									}
								}}
							/>
						) : (
							<h3
								className="text-h5 text-foreground cursor-pointer font-semibold"
								onClick={() => setIsEditing(true)}
							>
								{kid.name}
							</h3>
						)}
					</div>
				</div>
				<div className="flex items-center gap-2">
					<button
						onClick={() => setIsAddingAccount(!isAddingAccount)}
						className="text-muted-foreground hover:text-foreground p-2 transition-colors"
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
								d="M12 6v6m0 0v6m0-6h6m-6 0H6"
							/>
						</svg>
					</button>
					<fetcher.Form method="post">
						<input type="hidden" name="intent" value="delete-kid" />
						<input type="hidden" name="id" value={kid.id} />
						<button
							type="submit"
							onClick={(e) => {
								if (
									!confirm(
										'Are you sure you want to delete this kid and all their accounts?',
									)
								) {
									e.preventDefault()
								}
							}}
							className="text-destructive hover:text-destructive/80 p-2 transition-colors"
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
									d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
								/>
							</svg>
						</button>
					</fetcher.Form>
				</div>
			</div>

			{/* Add Account Form */}
			{isAddingAccount ? (
				<div className="bg-muted/50 mb-4 rounded-lg p-4">
					<fetcher.Form method="post" className="space-y-3">
						<input type="hidden" name="intent" value="create-account" />
						<input type="hidden" name="kidId" value={kid.id} />
						<div>
							<input
								type="text"
								name="name"
								placeholder="Account name (e.g., Savings, Allowance)"
								required
								className="border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded border px-3 py-2 focus:ring-2 focus:outline-none"
							/>
						</div>
						<div>
							<input
								type="number"
								name="balance"
								placeholder="Initial balance (optional)"
								defaultValue="0"
								className="border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded border px-3 py-2 focus:ring-2 focus:outline-none"
							/>
						</div>
						<div className="flex gap-2">
							<button
								type="submit"
								className="bg-primary text-primary-foreground hover:bg-primary/90 rounded px-4 py-2 transition-colors"
							>
								Add Account
							</button>
							<button
								type="button"
								onClick={() => setIsAddingAccount(false)}
								className="bg-muted text-muted-foreground hover:bg-muted/80 rounded px-4 py-2 transition-colors"
							>
								Cancel
							</button>
						</div>
					</fetcher.Form>
				</div>
			) : null}

			{/* Accounts List */}
			<div className="space-y-3">
				{kid.accounts.map((account: any) => (
					<DraggableAccount
						key={account.id}
						account={account}
						onReorder={(beforeId, afterId) => {
							fetcher.submit(
								{
									intent: 'reorder-account',
									id: account.id.toString(),
									beforeId: beforeId?.toString() || '',
									afterId: afterId?.toString() || '',
								},
								{ method: 'post' },
							)
						}}
					/>
				))}
			</div>
		</div>
	)
}

function DraggableAccount({
	account,
	onReorder,
}: {
	account: any
	onReorder: (beforeId: number | null, afterId: number | null) => void
}) {
	const [isEditing, setIsEditing] = useState(false)
	const [isUpdatingBalance, setIsUpdatingBalance] = useState(false)
	const [balanceAmount, setBalanceAmount] = useState('')
	const [error, setError] = useState<any>(null)
	const fetcher = useFetcher()
	const dragRef = useRef<HTMLDivElement>(null)

	// Handle fetcher errors
	useEffect(() => {
		if (fetcher.data?.error) {
			setError(fetcher.data.error)
		}
	}, [fetcher.data])

	function handleDragStart(e: React.DragEvent) {
		e.dataTransfer.setData('text/plain', account.id.toString())
		e.dataTransfer.effectAllowed = 'move'
	}

	function handleDrop(e: React.DragEvent) {
		e.preventDefault()
		const draggedId = parseInt(e.dataTransfer.getData('text/plain'))
		if (draggedId === account.id) return

		// Find the position to insert
		const rect = dragRef.current?.getBoundingClientRect()
		if (!rect) return

		const dropY = e.clientY
		const isAfter = dropY > rect.top + rect.height / 2

		// Get all accounts in this kid's section
		const accounts = Array.from(
			document.querySelectorAll(
				`[data-account-id][data-kid-id="${account.kidId}"]`,
			),
		)
		const currentIndex = accounts.findIndex(
			(el) => el.getAttribute('data-account-id') === account.id.toString(),
		)
		const draggedIndex = accounts.findIndex(
			(el) => el.getAttribute('data-account-id') === draggedId.toString(),
		)

		let beforeId: number | null = null
		let afterId: number | null = null

		if (draggedIndex < currentIndex) {
			if (isAfter) {
				const nextAccount = accounts[currentIndex + 1]
				afterId = nextAccount
					? parseInt(nextAccount.getAttribute('data-account-id') || '0')
					: null
			} else {
				const currentAccount = accounts[currentIndex]
				beforeId = currentAccount
					? parseInt(currentAccount.getAttribute('data-account-id') || '0')
					: null
			}
		} else {
			if (isAfter) {
				const nextAccount = accounts[currentIndex + 1]
				afterId = nextAccount
					? parseInt(nextAccount.getAttribute('data-account-id') || '0')
					: null
			} else {
				const prevAccount = accounts[currentIndex - 1]
				beforeId = prevAccount
					? parseInt(prevAccount.getAttribute('data-account-id') || '0')
					: null
			}
		}

		onReorder(beforeId, afterId)
	}

	function handleDragOver(e: React.DragEvent) {
		e.preventDefault()
		e.dataTransfer.dropEffect = 'move'
	}

	function updateBalance(operation: 'add' | 'remove') {
		const amount = parseInt(balanceAmount)
		if (isNaN(amount) || amount <= 0) {
			setError(
				createError(
					'validation',
					'Invalid amount',
					'Please enter a positive number',
					'INVALID_AMOUNT',
				),
			)
			return
		}

		fetcher.submit(
			{
				intent: 'update-balance',
				id: account.id.toString(),
				amount: amount.toString(),
				operation,
			},
			{ method: 'post' },
		)
		setBalanceAmount('')
		setIsUpdatingBalance(false)
	}

	return (
		<div
			ref={dragRef}
			data-account-id={account.id}
			data-kid-id={account.kidId}
			draggable
			onDragStart={handleDragStart}
			onDrop={handleDrop}
			onDragOver={handleDragOver}
			className="bg-muted/30 border-border flex items-center justify-between rounded-lg border p-3"
		>
			{/* Error Display */}
			<ErrorDisplay
				error={error}
				onDismiss={() => setError(null)}
				className="absolute top-0 right-0 left-0 z-10"
			/>

			<div className="flex-1">
				{isEditing ? (
					<input
						type="text"
						defaultValue={account.name}
						className="w-full border-none bg-transparent font-medium outline-none"
						onBlur={(e) => {
							fetcher.submit(
								{
									intent: 'update-account',
									id: account.id.toString(),
									name: e.target.value,
								},
								{ method: 'post' },
							)
							setIsEditing(false)
						}}
						onKeyDown={(e) => {
							if (e.key === 'Enter') {
								e.currentTarget.blur()
							}
						}}
					/>
				) : (
					<h4
						className="text-foreground cursor-pointer font-medium"
						onClick={() => setIsEditing(true)}
					>
						{account.name}
					</h4>
				)}
			</div>

			<div className="flex items-center gap-3">
				{/* Balance Display */}
				<div className="text-right">
					<div className="text-foreground font-semibold">
						${account.balance.toFixed(2)}
					</div>
				</div>

				{/* Balance Update Controls */}
				{isUpdatingBalance ? (
					<div className="flex items-center gap-2">
						<input
							type="number"
							value={balanceAmount}
							onChange={(e) => setBalanceAmount(e.target.value)}
							placeholder="Amount"
							className="border-input bg-background text-foreground focus:ring-ring w-20 rounded border px-2 py-1 text-sm focus:ring-1 focus:outline-none"
						/>
						<button
							onClick={() => updateBalance('add')}
							className="rounded bg-green-500 px-2 py-1 text-xs text-white transition-colors hover:bg-green-600"
						>
							+
						</button>
						<button
							onClick={() => updateBalance('remove')}
							className="rounded bg-red-500 px-2 py-1 text-xs text-white transition-colors hover:bg-red-600"
						>
							-
						</button>
						<button
							onClick={() => {
								setIsUpdatingBalance(false)
								setBalanceAmount('')
							}}
							className="bg-muted text-muted-foreground hover:bg-muted/80 rounded px-2 py-1 text-xs transition-colors"
						>
							×
						</button>
					</div>
				) : (
					<button
						onClick={() => setIsUpdatingBalance(true)}
						className="text-muted-foreground hover:text-foreground p-1 transition-colors"
					>
						<svg
							className="h-4 w-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 6v6m0 0v6m0-6h6m-6 0H6"
							/>
						</svg>
					</button>
				)}

				{/* Delete Account */}
				<fetcher.Form method="post">
					<input type="hidden" name="intent" value="delete-account" />
					<input type="hidden" name="id" value={account.id} />
					<button
						type="submit"
						onClick={(e) => {
							if (!confirm('Are you sure you want to delete this account?')) {
								e.preventDefault()
							}
						}}
						className="text-destructive hover:text-destructive/80 p-1 transition-colors"
					>
						<svg
							className="h-4 w-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
							/>
						</svg>
					</button>
				</fetcher.Form>
			</div>
		</div>
	)
}

export default function Ledger({ loaderData }: Route.ComponentProps) {
	const navigate = useNavigate()
	const [isAddingKid, setIsAddingKid] = useState(false)
	const [error, setError] = useState<any>(null)
	const fetcher = useFetcher()
	const actionData = useActionData<{ error?: any }>()

	// Handle action errors
	useEffect(() => {
		if (actionData?.error) {
			setError(actionData.error)
		}
	}, [actionData])

	// Handle fetcher errors
	useEffect(() => {
		if (fetcher.data?.error) {
			setError(fetcher.data.error)
		}
	}, [fetcher.data])

	function handleKidReorder(
		kidId: number,
		beforeId: number | null,
		afterId: number | null,
	) {
		fetcher.submit(
			{
				intent: 'reorder-kid',
				id: kidId.toString(),
				beforeId: beforeId?.toString() || '',
				afterId: afterId?.toString() || '',
			},
			{ method: 'post' },
		)
	}

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
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-h2 text-foreground font-bold">
								{loaderData.ledger.ledger.name}
							</h1>
							<p className="text-muted-foreground mt-1">
								Manage your kids' account balances
							</p>
						</div>
						<button
							onClick={() => setIsAddingKid(!isAddingKid)}
							className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 transition-colors"
						>
							Add Kid
						</button>
					</div>
				</div>

				{/* Error Display */}
				<ErrorDisplay error={error} onDismiss={() => setError(null)} />

				{/* Add Kid Form */}
				{isAddingKid ? (
					<div className="bg-card border-border mb-8 rounded-lg border p-6">
						<h2 className="text-h4 text-foreground mb-4 font-semibold">
							Add New Kid
						</h2>
						<fetcher.Form method="post" className="space-y-4">
							<input type="hidden" name="intent" value="create-kid" />
							<input
								type="hidden"
								name="ledgerId"
								value={loaderData.ledger.ledger.id}
							/>
							<div className="grid gap-4 md:grid-cols-2">
								<div>
									<label
										htmlFor="name"
										className="text-foreground mb-2 block text-sm font-medium"
									>
										Name
									</label>
									<input
										type="text"
										id="name"
										name="name"
										required
										placeholder="Enter kid's name"
										className="border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded border px-3 py-2 focus:ring-2 focus:outline-none"
									/>
								</div>
								<div>
									<label
										htmlFor="emoji"
										className="text-foreground mb-2 block text-sm font-medium"
									>
										Emoji Avatar
									</label>
									<input
										type="text"
										id="emoji"
										name="emoji"
										required
										placeholder="👶"
										className="border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded border px-3 py-2 focus:ring-2 focus:outline-none"
									/>
								</div>
							</div>
							<div className="flex gap-2">
								<button
									type="submit"
									className="bg-primary text-primary-foreground hover:bg-primary/90 rounded px-4 py-2 transition-colors"
								>
									Add Kid
								</button>
								<button
									type="button"
									onClick={() => setIsAddingKid(false)}
									className="bg-muted text-muted-foreground hover:bg-muted/80 rounded px-4 py-2 transition-colors"
								>
									Cancel
								</button>
							</div>
						</fetcher.Form>
					</div>
				) : null}

				{/* Kids List */}
				<div className="space-y-6">
					{loaderData.ledger.kids.length === 0 ? (
						<div className="py-12 text-center">
							<div className="mb-4 text-6xl">👶</div>
							<h3 className="text-h4 text-foreground mb-2 font-semibold">
								No Kids Yet
							</h3>
							<p className="text-muted-foreground mb-4">
								Add your first kid to start tracking their account balances
							</p>
							<button
								onClick={() => setIsAddingKid(true)}
								className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-6 py-3 transition-colors"
							>
								Add Your First Kid
							</button>
						</div>
					) : (
						loaderData.ledger.kids.map((kid: any) => (
							<DraggableKid
								key={kid.id}
								kid={kid}
								onReorder={(beforeId, afterId) =>
									handleKidReorder(kid.id, beforeId, afterId)
								}
							/>
						))
					)}
				</div>
			</div>
		</div>
	)
}
