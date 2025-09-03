import { invariantResponse } from '@epic-web/invariant'
import { Form, useFetcher, useNavigate } from 'react-router'
import { useState, useRef, useEffect } from 'react'
import type { Route } from './+types/ledger'

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
	const ledger = await context.db.getFullLedger(params.ledgerId)
	invariantResponse(ledger, 'Ledger not found', { status: 404 })
	return { ledger }
}

// Action handlers for all CRUD operations
export async function action({ context, request }: Route.ActionArgs) {
	const formData = await request.formData()
	const intent = formData.get('intent') as string

	try {
		switch (intent) {
			case 'create-kid': {
				const ledgerId = formData.get('ledgerId') as string
				const name = formData.get('name') as string
				const emoji = formData.get('emoji') as string

				if (!name?.trim() || !emoji) {
					return { error: 'Name and emoji are required' }
				}

				await context.db.createKid({
					ledgerId,
					name: name.trim(),
					emoji,
				})
				break
			}

			case 'update-kid': {
				const id = parseInt(formData.get('id') as string)
				const name = formData.get('name') as string
				const emoji = formData.get('emoji') as string

				if (!name?.trim() || !emoji) {
					return { error: 'Name and emoji are required' }
				}

				await context.db.updateKid(id, {
					name: name.trim(),
					emoji,
				})
				break
			}

			case 'delete-kid': {
				const id = parseInt(formData.get('id') as string)
				await context.db.deleteKid(id)
				break
			}

			case 'reorder-kid': {
				const id = parseInt(formData.get('id') as string)
				const beforeId = formData.get('beforeId') as string
				const afterId = formData.get('afterId') as string

				await context.db.reorderKidBetween(
					id,
					beforeId ? parseInt(beforeId) : null,
					afterId ? parseInt(afterId) : null,
				)
				break
			}

			case 'create-account': {
				const kidId = parseInt(formData.get('kidId') as string)
				const name = formData.get('name') as string
				const balance = parseInt(formData.get('balance') as string) || 0

				if (!name?.trim()) {
					return { error: 'Account name is required' }
				}

				await context.db.createAccount({
					kidId,
					name: name.trim(),
					balance,
				})
				break
			}

			case 'update-account': {
				const id = parseInt(formData.get('id') as string)
				const name = formData.get('name') as string

				if (!name?.trim()) {
					return { error: 'Account name is required' }
				}

				await context.db.updateAccount(id, {
					name: name.trim(),
				})
				break
			}

			case 'delete-account': {
				const id = parseInt(formData.get('id') as string)
				await context.db.deleteAccount(id)
				break
			}

			case 'update-balance': {
				const id = parseInt(formData.get('id') as string)
				const amount = parseInt(formData.get('amount') as string)
				const operation = formData.get('operation') as string

				const account = await context.db.getAccount(id)
				if (!account) {
					return { error: 'Account not found' }
				}

				const newBalance = operation === 'add' ? account.balance + amount : account.balance - amount
				await context.db.updateAccount(id, { balance: newBalance })
				break
			}

			case 'reorder-account': {
				const id = parseInt(formData.get('id') as string)
				const beforeId = formData.get('beforeId') as string
				const afterId = formData.get('afterId') as string

				await context.db.reorderAccountBetween(
					id,
					beforeId ? parseInt(beforeId) : null,
					afterId ? parseInt(afterId) : null,
				)
				break
			}

			default:
				return { error: 'Invalid intent' }
		}

		return { success: true }
	} catch (error) {
		return { error: 'Operation failed' }
	}
}

// Drag and Drop Components
function DraggableKid({ kid, onReorder }: { kid: any; onReorder: (beforeId: number | null, afterId: number | null) => void }) {
	const [isDragging, setIsDragging] = useState(false)
	const [isEditing, setIsEditing] = useState(false)
	const [isAddingAccount, setIsAddingAccount] = useState(false)
	const fetcher = useFetcher()
	const dragRef = useRef<HTMLDivElement>(null)

	const handleDragStart = (e: React.DragEvent) => {
		setIsDragging(true)
		e.dataTransfer.setData('text/plain', kid.id.toString())
		e.dataTransfer.effectAllowed = 'move'
	}

	const handleDragEnd = () => {
		setIsDragging(false)
	}

	const handleDrop = (e: React.DragEvent) => {
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
		const currentIndex = kids.findIndex(el => el.getAttribute('data-kid-id') === kid.id.toString())
		const draggedIndex = kids.findIndex(el => el.getAttribute('data-kid-id') === draggedId.toString())

		let beforeId: number | null = null
		let afterId: number | null = null

		if (draggedIndex < currentIndex) {
			// Dragging from earlier to later
			if (isAfter) {
				const nextKid = kids[currentIndex + 1]
				afterId = nextKid ? parseInt(nextKid.getAttribute('data-kid-id') || '0') : null
			} else {
				const currentKid = kids[currentIndex]
				beforeId = currentKid ? parseInt(currentKid.getAttribute('data-kid-id') || '0') : null
			}
		} else {
			// Dragging from later to earlier
			if (isAfter) {
				const nextKid = kids[currentIndex + 1]
				afterId = nextKid ? parseInt(nextKid.getAttribute('data-kid-id') || '0') : null
			} else {
				const prevKid = kids[currentIndex - 1]
				beforeId = prevKid ? parseInt(prevKid.getAttribute('data-kid-id') || '0') : null
			}
		}

		onReorder(beforeId, afterId)
	}

	const handleDragOver = (e: React.DragEvent) => {
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
			className={`bg-card border border-border rounded-lg p-4 mb-4 transition-all ${
				isDragging ? 'opacity-50 scale-95' : ''
			}`}
		>
			{/* Kid Header */}
			<div className="flex items-center justify-between mb-4">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center text-xl">
						{isEditing ? (
							<input
								type="text"
								defaultValue={kid.emoji}
								className="w-8 h-8 text-center bg-transparent border-none outline-none"
								onBlur={(e) => {
									fetcher.submit(
										{
											intent: 'update-kid',
											id: kid.id.toString(),
											name: kid.name,
											emoji: e.target.value,
										},
										{ method: 'post' }
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
							<span onClick={() => setIsEditing(true)} className="cursor-pointer">
								{kid.emoji}
							</span>
						)}
					</div>
					<div>
						{isEditing ? (
							<input
								type="text"
								defaultValue={kid.name}
								className="text-h5 font-semibold bg-transparent border-none outline-none"
								onBlur={(e) => {
									fetcher.submit(
										{
											intent: 'update-kid',
											id: kid.id.toString(),
											name: e.target.value,
											emoji: kid.emoji,
										},
										{ method: 'post' }
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
								className="text-h5 font-semibold text-foreground cursor-pointer"
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
						className="p-2 text-muted-foreground hover:text-foreground transition-colors"
					>
						<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
						</svg>
					</button>
					<fetcher.Form method="post">
						<input type="hidden" name="intent" value="delete-kid" />
						<input type="hidden" name="id" value={kid.id} />
						<button
							type="submit"
							onClick={(e) => {
								if (!confirm('Are you sure you want to delete this kid and all their accounts?')) {
									e.preventDefault()
								}
							}}
							className="p-2 text-destructive hover:text-destructive/80 transition-colors"
						>
							<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
							</svg>
						</button>
					</fetcher.Form>
				</div>
			</div>

			{/* Add Account Form */}
			{isAddingAccount && (
				<div className="mb-4 p-4 bg-muted/50 rounded-lg">
					<fetcher.Form method="post" className="space-y-3">
						<input type="hidden" name="intent" value="create-account" />
						<input type="hidden" name="kidId" value={kid.id} />
						<div>
							<input
								type="text"
								name="name"
								placeholder="Account name (e.g., Savings, Allowance)"
								required
								className="w-full px-3 py-2 rounded border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
							/>
						</div>
						<div>
							<input
								type="number"
								name="balance"
								placeholder="Initial balance (optional)"
								defaultValue="0"
								className="w-full px-3 py-2 rounded border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
							/>
						</div>
						<div className="flex gap-2">
							<button
								type="submit"
								className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
							>
								Add Account
							</button>
							<button
								type="button"
								onClick={() => setIsAddingAccount(false)}
								className="px-4 py-2 bg-muted text-muted-foreground rounded hover:bg-muted/80 transition-colors"
							>
								Cancel
							</button>
						</div>
					</fetcher.Form>
				</div>
			)}

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
								{ method: 'post' }
							)
						}}
					/>
				))}
			</div>
		</div>
	)
}

function DraggableAccount({ account, onReorder }: { account: any; onReorder: (beforeId: number | null, afterId: number | null) => void }) {
	const [isEditing, setIsEditing] = useState(false)
	const [isUpdatingBalance, setIsUpdatingBalance] = useState(false)
	const [balanceAmount, setBalanceAmount] = useState('')
	const fetcher = useFetcher()
	const dragRef = useRef<HTMLDivElement>(null)

	const handleDragStart = (e: React.DragEvent) => {
		e.dataTransfer.setData('text/plain', account.id.toString())
		e.dataTransfer.effectAllowed = 'move'
	}

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault()
		const draggedId = parseInt(e.dataTransfer.getData('text/plain'))
		if (draggedId === account.id) return

		// Find the position to insert
		const rect = dragRef.current?.getBoundingClientRect()
		if (!rect) return

		const dropY = e.clientY
		const isAfter = dropY > rect.top + rect.height / 2

		// Get all accounts in this kid's section
		const accounts = Array.from(document.querySelectorAll(`[data-account-id][data-kid-id="${account.kidId}"]`))
		const currentIndex = accounts.findIndex(el => el.getAttribute('data-account-id') === account.id.toString())
		const draggedIndex = accounts.findIndex(el => el.getAttribute('data-account-id') === draggedId.toString())

		let beforeId: number | null = null
		let afterId: number | null = null

		if (draggedIndex < currentIndex) {
			if (isAfter) {
				const nextAccount = accounts[currentIndex + 1]
				afterId = nextAccount ? parseInt(nextAccount.getAttribute('data-account-id') || '0') : null
			} else {
				const currentAccount = accounts[currentIndex]
				beforeId = currentAccount ? parseInt(currentAccount.getAttribute('data-account-id') || '0') : null
			}
		} else {
			if (isAfter) {
				const nextAccount = accounts[currentIndex + 1]
				afterId = nextAccount ? parseInt(nextAccount.getAttribute('data-account-id') || '0') : null
			} else {
				const prevAccount = accounts[currentIndex - 1]
				beforeId = prevAccount ? parseInt(prevAccount.getAttribute('data-account-id') || '0') : null
			}
		}

		onReorder(beforeId, afterId)
	}

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault()
		e.dataTransfer.dropEffect = 'move'
	}

	const updateBalance = (operation: 'add' | 'remove') => {
		const amount = parseInt(balanceAmount)
		if (isNaN(amount) || amount <= 0) return

		fetcher.submit(
			{
				intent: 'update-balance',
				id: account.id.toString(),
				amount: amount.toString(),
				operation,
			},
			{ method: 'post' }
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
			className="bg-muted/30 border border-border rounded-lg p-3 flex items-center justify-between"
		>
			<div className="flex-1">
				{isEditing ? (
					<input
						type="text"
						defaultValue={account.name}
						className="font-medium bg-transparent border-none outline-none w-full"
						onBlur={(e) => {
							fetcher.submit(
								{
									intent: 'update-account',
									id: account.id.toString(),
									name: e.target.value,
								},
								{ method: 'post' }
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
						className="font-medium text-foreground cursor-pointer"
						onClick={() => setIsEditing(true)}
					>
						{account.name}
					</h4>
				)}
			</div>

			<div className="flex items-center gap-3">
				{/* Balance Display */}
				<div className="text-right">
					<div className="font-semibold text-foreground">
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
							className="w-20 px-2 py-1 text-sm rounded border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
						/>
						<button
							onClick={() => updateBalance('add')}
							className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
						>
							+
						</button>
						<button
							onClick={() => updateBalance('remove')}
							className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
						>
							-
						</button>
						<button
							onClick={() => {
								setIsUpdatingBalance(false)
								setBalanceAmount('')
							}}
							className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded hover:bg-muted/80 transition-colors"
						>
							×
						</button>
					</div>
				) : (
					<button
						onClick={() => setIsUpdatingBalance(true)}
						className="p-1 text-muted-foreground hover:text-foreground transition-colors"
					>
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
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
						className="p-1 text-destructive hover:text-destructive/80 transition-colors"
					>
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
	const fetcher = useFetcher()

	const handleKidReorder = (kidId: number, beforeId: number | null, afterId: number | null) => {
		fetcher.submit(
			{
				intent: 'reorder-kid',
				id: kidId.toString(),
				beforeId: beforeId?.toString() || '',
				afterId: afterId?.toString() || '',
			},
			{ method: 'post' }
		)
	}

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
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-h2 font-bold text-foreground">{loaderData.ledger.ledger.name}</h1>
							<p className="text-muted-foreground mt-1">
								Manage your kids' expenses and accounts
							</p>
						</div>
						<button
							onClick={() => setIsAddingKid(!isAddingKid)}
							className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
						>
							Add Kid
						</button>
					</div>
				</div>

				{/* Add Kid Form */}
				{isAddingKid && (
					<div className="mb-8 p-6 bg-card border border-border rounded-lg">
						<h2 className="text-h4 font-semibold text-foreground mb-4">Add New Kid</h2>
						<fetcher.Form method="post" className="space-y-4">
							<input type="hidden" name="intent" value="create-kid" />
							<input type="hidden" name="ledgerId" value={loaderData.ledger.ledger.id} />
							<div className="grid md:grid-cols-2 gap-4">
								<div>
									<label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
										Name
									</label>
									<input
										type="text"
										id="name"
										name="name"
										required
										placeholder="Enter kid's name"
										className="w-full px-3 py-2 rounded border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
									/>
								</div>
								<div>
									<label htmlFor="emoji" className="block text-sm font-medium text-foreground mb-2">
										Emoji Avatar
									</label>
									<input
										type="text"
										id="emoji"
										name="emoji"
										required
										placeholder="👶"
										className="w-full px-3 py-2 rounded border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
									/>
								</div>
							</div>
							<div className="flex gap-2">
								<button
									type="submit"
									className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
								>
									Add Kid
								</button>
								<button
									type="button"
									onClick={() => setIsAddingKid(false)}
									className="px-4 py-2 bg-muted text-muted-foreground rounded hover:bg-muted/80 transition-colors"
								>
									Cancel
								</button>
							</div>
						</fetcher.Form>
					</div>
				)}

				{/* Kids List */}
				<div className="space-y-6">
					{loaderData.ledger.kids.length === 0 ? (
						<div className="text-center py-12">
							<div className="text-6xl mb-4">👶</div>
							<h3 className="text-h4 font-semibold text-foreground mb-2">No Kids Yet</h3>
							<p className="text-muted-foreground mb-4">
								Add your first kid to start tracking their expenses
							</p>
							<button
								onClick={() => setIsAddingKid(true)}
								className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors"
							>
								Add Your First Kid
							</button>
						</div>
					) : (
						loaderData.ledger.kids.map((kid: any) => (
							<DraggableKid
								key={kid.id}
								kid={kid}
								onReorder={(beforeId, afterId) => handleKidReorder(kid.id, beforeId, afterId)}
							/>
						))
					)}
				</div>
			</div>
		</div>
	)
}
