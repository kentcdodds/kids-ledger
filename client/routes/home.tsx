import { type Handle } from 'remix/component'
import {
	createTransaction,
	createTransfer,
	fetchDashboard,
	type KidAccount,
	type KidSummary,
} from '#client/ledger-api.ts'
import { launchConfetti } from '#client/confetti.ts'
import {
	clearKidModalBackground,
	setKidModalBackground,
} from '#client/kid-modal-background.ts'
import { formatCents, parseAmountToCents } from '#client/money.ts'
import { getAccountGradientBackground } from '#client/styles/account-colors.ts'
import {
	colors,
	radius,
	shadows,
	spacing,
	transitions,
	typography,
	mq,
} from '#client/styles/tokens.ts'
import { inputCss, buttonCss } from '#client/styles/form-controls.ts'
import { buildTransactionModalCss } from '#client/styles/transaction-modal-css.ts'
import { handleModalKeydown } from '#client/dom-utils.ts'
import {
	calculateMonthlyInterestCents,
	formatApyLabel,
} from '#shared/ledger-interest.ts'

type TransactionState = {
	kid: KidSummary
	account: KidAccount
	amount: string
	note: string
	status: 'idle' | 'saving'
	error: string | null
	warning: string | null
}

type TransferState = {
	fromKid: KidSummary
	fromAccount: KidAccount
	toAccountId: string
	amount: string
	note: string
	status: 'idle' | 'saving'
	error: string | null
}

const modalCloseAnimationDurationMs = 220

function getNextMonthlyInterestPayoutDate(from = new Date()) {
	return new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1))
}

function formatPayoutDate(date: Date) {
	return new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
		timeZone: 'UTC',
	}).format(date)
}

function getInterestPreviewText(account: KidAccount) {
	if (account.apyBasisPoints <= 0) return null
	const nextPayoutCents = calculateMonthlyInterestCents({
		balanceCents: account.balanceCents,
		apyBasisPoints: account.apyBasisPoints,
	})
	return `${formatApyLabel(account.apyBasisPoints)} · estimated payout ${formatCents(
		nextPayoutCents,
	)} on ${formatPayoutDate(getNextMonthlyInterestPayoutDate())}`
}

export function HomeRoute(handle: Handle) {
	let status: 'loading' | 'ready' | 'error' = 'loading'
	let errorMessage = ''
	let needsLogin = false
	let kids: Array<KidSummary> = []
	let familyBalance = 0
	let quickAmounts: Array<number> = []
	let transactionState: TransactionState | null = null
	let transactionModalOpener: HTMLButtonElement | null = null
	let transactionModalClosing = false
	let closeModalTimeoutId: number | null = null
	let transferState: TransferState | null = null
	let transferModalOpener: HTMLButtonElement | null = null
	let transferModalClosing = false
	let closeTransferModalTimeoutId: number | null = null

	function removeTransactionModalStyles() {
		if (typeof document === 'undefined') return
		for (const element of document.querySelectorAll(
			'style[data-kid-transaction-modal-css]',
		)) {
			element.remove()
		}
	}

	function clearCloseModalTimeout() {
		if (closeModalTimeoutId === null) return
		window.clearTimeout(closeModalTimeoutId)
		closeModalTimeoutId = null
	}

	function clearTransferCloseModalTimeout() {
		if (closeTransferModalTimeoutId === null) return
		window.clearTimeout(closeTransferModalTimeoutId)
		closeTransferModalTimeoutId = null
	}

	function openTransactionModal(
		kid: KidSummary,
		account: KidAccount,
		opener: HTMLButtonElement,
	) {
		clearCloseModalTimeout()
		removeTransactionModalStyles()
		setKidModalBackground(kid.emoji)
		transactionModalOpener = opener
		transactionModalClosing = false
		transactionState = {
			kid,
			account,
			amount: '',
			note: '',
			status: 'idle',
			error: null,
			warning: null,
		}
		handle.update()
		handle.queueTask(() => {
			const closeButton = document.getElementById('transaction-modal-close')
			if (closeButton instanceof HTMLButtonElement) {
				closeButton.focus()
			}
		})
	}

	function openTransferModal(
		kid: KidSummary,
		account: KidAccount,
		opener: HTMLButtonElement,
	) {
		clearTransferCloseModalTimeout()
		setKidModalBackground(kid.emoji)
		transferModalOpener = opener
		transferModalClosing = false
		const destination = getDefaultTransferDestination(kid, account, kids)
		transferState = {
			fromKid: kid,
			fromAccount: account,
			toAccountId: destination ? String(destination.id) : '',
			amount: '',
			note: '',
			status: 'idle',
			error: destination ? null : 'Add another account before transferring.',
		}
		handle.update()
		handle.queueTask(() => {
			const closeButton = document.getElementById('transfer-modal-close')
			if (closeButton instanceof HTMLButtonElement) {
				closeButton.focus()
			}
		})
	}

	function closeTransactionModal() {
		if (!transactionState || transactionModalClosing) return
		const opener = transactionModalOpener
		transactionModalOpener = null
		transactionModalClosing = true
		handle.update()
		closeModalTimeoutId = window.setTimeout(() => {
			transactionState = null
			transactionModalClosing = false
			closeModalTimeoutId = null
			removeTransactionModalStyles()
			clearKidModalBackground()
			handle.update()
			if (opener?.isConnected) {
				handle.queueTask(() => {
					opener.focus()
				})
			}
		}, modalCloseAnimationDurationMs)
	}

	function closeTransferModal() {
		if (!transferState || transferModalClosing) return
		const opener = transferModalOpener
		transferModalOpener = null
		transferModalClosing = true
		handle.update()
		closeTransferModalTimeoutId = window.setTimeout(() => {
			transferState = null
			transferModalClosing = false
			closeTransferModalTimeoutId = null
			clearKidModalBackground()
			handle.update()
			if (opener?.isConnected) {
				handle.queueTask(() => {
					opener.focus()
				})
			}
		}, modalCloseAnimationDurationMs)
	}

	function handleTransactionModalKeydown(event: KeyboardEvent) {
		handleModalKeydown(event, closeTransactionModal)
	}

	function handleTransferModalKeydown(event: KeyboardEvent) {
		handleModalKeydown(event, closeTransferModal)
	}

	async function refreshDashboard() {
		status = 'loading'
		needsLogin = false
		handle.update()
		try {
			const dashboard = await fetchDashboard()
			kids = dashboard.kids
			familyBalance = dashboard.familyBalanceCents
			quickAmounts = dashboard.quickAmounts
			status = 'ready'
			errorMessage = ''
		} catch (error) {
			status = 'error'
			errorMessage =
				error instanceof Error ? error.message : 'Failed to load ledger data.'
			needsLogin = isAuthError(errorMessage)
		}
		handle.update()
	}

	handle.queueTask(async () => {
		await refreshDashboard()
	})
	handle.queueTask(() => {
		return () => {
			clearCloseModalTimeout()
			clearTransferCloseModalTimeout()
			removeTransactionModalStyles()
			clearKidModalBackground()
		}
	})

	function setTransactionAmountFromQuick(cents: number) {
		if (!transactionState) return
		transactionState.amount = (cents / 100).toFixed(2)
		transactionState.error = null
		handle.update()
	}

	function setTransferAmountFromQuick(cents: number) {
		if (!transferState) return
		transferState.amount = (cents / 100).toFixed(2)
		transferState.error = null
		handle.update()
	}

	async function submitTransaction(direction: 'add' | 'remove') {
		if (!transactionState || transactionState.status === 'saving') return
		const cents = parseAmountToCents(transactionState.amount)
		if (cents === null || cents <= 0) {
			transactionState.error = 'Enter an amount greater than zero.'
			handle.update()
			return
		}
		const accountId = transactionState.account.id
		const note = transactionState.note
		const signedAmount = direction === 'remove' ? -Math.abs(cents) : cents
		transactionState.status = 'saving'
		transactionState.error = null
		handle.update()
		closeTransactionModal()
		try {
			const result = await createTransaction({
				accountId,
				amountCents: signedAmount,
				note,
			})
			if (direction === 'add') {
				launchConfetti()
			}
			if (result.result.warning) {
				window.alert(result.result.warning)
			}
			await refreshDashboard()
		} catch (error) {
			window.alert(
				error instanceof Error ? error.message : 'Could not save transaction.',
			)
		}
	}

	async function submitTransfer() {
		if (!transferState || transferState.status === 'saving') return
		const cents = parseAmountToCents(transferState.amount)
		if (cents === null || cents <= 0) {
			transferState.error = 'Enter an amount greater than zero.'
			handle.update()
			return
		}
		const toAccountId = Number(transferState.toAccountId)
		if (!Number.isInteger(toAccountId) || toAccountId < 1) {
			transferState.error = 'Choose a destination account.'
			handle.update()
			return
		}
		if (toAccountId === transferState.fromAccount.id) {
			transferState.error = 'Choose two different accounts.'
			handle.update()
			return
		}
		const fromAccountId = transferState.fromAccount.id
		const note = transferState.note
		transferState.status = 'saving'
		transferState.error = null
		handle.update()
		closeTransferModal()
		try {
			const result = await createTransfer({
				fromAccountId,
				toAccountId,
				amountCents: cents,
				note,
			})
			if (result.result.warning) {
				window.alert(result.result.warning)
			}
			await refreshDashboard()
		} catch (error) {
			window.alert(
				error instanceof Error ? error.message : 'Could not save transfer.',
			)
		}
	}

	return () => (
		<section css={{ display: 'grid', gap: spacing.lg }}>
			{status === 'ready' ? (
				<header
					css={{
						display: 'grid',
						gap: spacing.sm,
						justifyItems: 'center',
						textAlign: 'center',
					}}
				>
					<h1 css={{ margin: 0, color: colors.text }}>Family Ledger</h1>
					<p css={{ margin: 0, color: colors.textMuted }}>
						Family Total:{' '}
						<strong css={{ color: colors.text }}>
							{formatCents(familyBalance)}
						</strong>
					</p>
				</header>
			) : null}

			{status === 'loading' ? (
				<p css={{ color: colors.textMuted }}>Loading your ledger...</p>
			) : null}
			{status === 'error' && needsLogin ? LoggedOutHome() : null}
			{status === 'error' && !needsLogin ? (
				<p css={{ color: colors.error }}>{errorMessage}</p>
			) : null}
			{status === 'ready' && kids.length === 0 ? (
				<section
					css={{
						padding: spacing.lg,
						border: `3px dashed ${colors.border}`,
						borderRadius: radius.xl,
						backgroundColor: colors.surface,
						display: 'grid',
						gap: spacing.sm,
					}}
				>
					<h2 css={{ margin: 0, color: colors.text }}>No kids yet</h2>
					<p css={{ margin: 0, color: colors.textMuted }}>
						Open <a href="/settings">Settings</a> to add your first kid and
						account.
					</p>
				</section>
			) : null}

			{kids.map((kid) => (
				<article
					key={kid.id}
					css={{
						display: 'grid',
						gap: spacing.md,
						padding: spacing.lg,
						borderRadius: radius.xl,
						border: `3px solid ${colors.border}`,
						backgroundColor: colors.surface,
						boxShadow: shadows.md,
					}}
				>
					<header
						css={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							gap: spacing.md,
						}}
					>
						<div>
							<h2 css={{ margin: 0, color: colors.text }}>
								{kid.emoji} {kid.name}
							</h2>
							<p css={{ margin: 0, color: colors.textMuted }}>
								Total: {formatCents(kid.totalBalanceCents)}
							</p>
						</div>
					</header>
					<div css={{ display: 'grid', gap: spacing.sm }}>
						{kid.accounts.length === 0 ? (
							<p css={{ margin: 0, color: colors.textMuted }}>
								No accounts yet. <a href="/settings">Add one in settings.</a>
							</p>
						) : null}
						{kid.accounts.map((account) => {
							const interestPreviewText = getInterestPreviewText(account)
							return (
								<article
									key={account.id}
									css={{
										display: 'grid',
										gridTemplateColumns: 'minmax(0, 1fr) auto',
										gap: spacing.sm,
										alignItems: 'stretch',
										padding: spacing.xs,
										borderRadius: radius.lg,
										background: getAccountGradientBackground(
											account.colorToken,
										),
										color: '#ffffff',
										boxShadow: `0 4px 0 0 rgba(0,0,0,0.2)`,
										[mq.mobile]: {
											gridTemplateColumns: '1fr',
										},
									}}
								>
									<button
										type="button"
										on={{
											click: (event) => {
												if (!(event.currentTarget instanceof HTMLButtonElement))
													return
												openTransactionModal(kid, account, event.currentTarget)
											},
										}}
										css={{
											display: 'flex',
											justifyContent: 'space-between',
											alignItems: 'center',
											gap: spacing.sm,
											minWidth: 0,
											padding: spacing.sm,
											border: 'none',
											borderRadius: radius.md,
											background: 'transparent',
											color: 'inherit',
											cursor: 'pointer',
											textAlign: 'left',
											transition: `background-color ${transitions.fast}`,
											'&:hover': {
												backgroundColor: 'rgba(255,255,255,0.14)',
											},
										}}
									>
										<span
											css={{
												display: 'grid',
												gap: 2,
												minWidth: 0,
												fontWeight: typography.fontWeight.semibold,
											}}
										>
											{account.name}
											<span
												css={{ fontSize: typography.fontSize.sm, opacity: 0.9 }}
											>
												Tap to add or remove money
											</span>
											{interestPreviewText ? (
												<span
													css={{
														fontSize: typography.fontSize.sm,
														fontWeight: typography.fontWeight.normal,
														opacity: 0.9,
													}}
												>
													{interestPreviewText}
												</span>
											) : null}
										</span>
										<strong
											css={{
												flexShrink: 0,
												fontSize: typography.fontSize.lg,
											}}
										>
											{formatCents(account.balanceCents)}
										</strong>
									</button>
									<button
										type="button"
										on={{
											click: (event) => {
												if (!(event.currentTarget instanceof HTMLButtonElement))
													return
												openTransferModal(kid, account, event.currentTarget)
											},
										}}
										css={{
											...buttonCss,
											alignSelf: 'stretch',
											backgroundColor: 'rgba(255,255,255,0.92)',
											color: colors.text,
											boxShadow: '0 3px 0 0 rgba(0,0,0,0.2)',
											'&:active': {
												transform: 'translateY(3px)',
												boxShadow: '0 0 0 0 rgba(0,0,0,0.2)',
											},
										}}
									>
										Transfer
									</button>
								</article>
							)
						})}
					</div>
				</article>
			))}

			{transactionState ? (
				<div
					on={{
						click: (event) => {
							if (event.target === event.currentTarget) {
								closeTransactionModal()
							}
						},
					}}
					css={{
						position: 'fixed',
						inset: 0,
						backgroundColor: 'rgba(0, 0, 0, 0.45)',
						display: 'grid',
						placeItems: 'center',
						padding: spacing.md,
						zIndex: 1000,
						pointerEvents: transactionModalClosing ? 'none' : 'auto',
						animation: transactionModalClosing
							? `modal-backdrop-out ${modalCloseAnimationDurationMs}ms ease-in forwards`
							: 'modal-backdrop-in 180ms ease-out forwards',
						[mq.mobile]: {
							padding: 0,
							placeItems: 'stretch',
						},
					}}
				>
					{transactionState.kid.transactionModalCss.trim() ? (
						<style data-kid-transaction-modal-css>
							{buildTransactionModalCss(
								transactionState.kid.transactionModalCss,
							)}
						</style>
					) : null}
					<section
						role="dialog"
						aria-modal="true"
						aria-labelledby="transaction-modal-title"
						aria-describedby="transaction-modal-description"
						data-kid-transaction-modal
						on={{ keydown: handleTransactionModalKeydown }}
						css={{
							width: 'min(30rem, 100%)',
							maxHeight: 'calc(100dvh - 2 * var(--spacing-md))',
							overflow: 'auto',
							display: 'grid',
							gap: spacing.md,
							padding: spacing.lg,
							fontFamily: typography.fontFamily,
							borderRadius: radius.xl,
							border: `3px solid ${colors.border}`,
							backgroundColor: colors.surface,
							boxShadow: shadows.lg,
							animation: transactionModalClosing
								? `modal-close ${modalCloseAnimationDurationMs}ms ease-in forwards`
								: 'modal-pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
							[mq.mobile]: {
								width: '100%',
								maxHeight: '100dvh',
								minHeight: '100dvh',
								borderRadius: 0,
								border: 'none',
								gap: spacing.sm,
								padding: spacing.md,
							},
						}}
					>
						<header css={{ display: 'flex', justifyContent: 'space-between' }}>
							<div>
								<h3
									id="transaction-modal-title"
									css={{ margin: 0, color: colors.text }}
								>
									{transactionState.kid.emoji} {transactionState.kid.name}
								</h3>
								<p
									id="transaction-modal-description"
									css={{ margin: 0, color: colors.textMuted }}
								>
									{transactionState.account.name} ·{' '}
									{formatCents(transactionState.account.balanceCents)}
								</p>
							</div>
							<button
								id="transaction-modal-close"
								type="button"
								on={{ click: closeTransactionModal }}
								css={{
									border: 'none',
									background: 'transparent',
									color: colors.textMuted,
									cursor: 'pointer',
								}}
							>
								Close
							</button>
						</header>

						<label css={{ display: 'grid', gap: spacing.xs }}>
							<span css={{ color: colors.text }}>Amount</span>
							<input
								type="number"
								min="0"
								step="0.01"
								value={transactionState.amount}
								on={{
									input: (event) => {
										if (!(event.currentTarget instanceof HTMLInputElement))
											return
										transactionState!.amount = event.currentTarget.value
										transactionState!.error = null
										handle.update()
									},
								}}
								css={inputCss}
							/>
						</label>

						<div css={{ display: 'grid', gap: spacing.xs }}>
							<span
								css={{
									color: colors.textMuted,
									fontSize: typography.fontSize.sm,
								}}
							>
								Quick amounts
							</span>
							<div
								css={{
									display: 'grid',
									gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
									gap: spacing.xs,
								}}
							>
								<button
									type="button"
									disabled={
										Math.abs(transactionState!.account.balanceCents) === 0
									}
									on={{
										click: () =>
											setTransactionAmountFromQuick(
												Math.abs(transactionState!.account.balanceCents),
											),
									}}
									css={{
										...buttonCss,
										backgroundColor: colors.surface,
										color: colors.text,
										border: `2px solid ${colors.border}`,
										boxShadow: `0 2px 0 0 ${colors.border}`,
										'&:active': {
											transform: 'translateY(2px)',
											boxShadow: `0 0 0 0 ${colors.border}`,
										},
									}}
								>
									{`Current Total (${formatCents(
										transactionState.account.balanceCents,
									)})`}
								</button>
								{quickAmounts.map((amount) => (
									<button
										key={amount}
										type="button"
										on={{ click: () => setTransactionAmountFromQuick(amount) }}
										css={{
											...buttonCss,
											backgroundColor: colors.surface,
											color: colors.text,
											border: `2px solid ${colors.border}`,
											boxShadow: `0 2px 0 0 ${colors.border}`,
											'&:active': {
												transform: 'translateY(2px)',
												boxShadow: `0 0 0 0 ${colors.border}`,
											},
										}}
									>
										{formatCents(amount)}
									</button>
								))}
							</div>
						</div>

						<label css={{ display: 'grid', gap: spacing.xs }}>
							<span css={{ color: colors.text }}>Note (optional)</span>
							<input
								type="text"
								value={transactionState.note}
								on={{
									input: (event) => {
										if (!(event.currentTarget instanceof HTMLInputElement))
											return
										transactionState!.note = event.currentTarget.value
										handle.update()
									},
								}}
								css={inputCss}
							/>
						</label>

						{transactionState.error ? (
							<p css={{ margin: 0, color: colors.error }}>
								{transactionState.error}
							</p>
						) : null}
						{transactionState.warning ? (
							<p css={{ margin: 0, color: '#b45309' }}>
								{transactionState.warning}
							</p>
						) : null}

						<div
							css={{
								display: 'grid',
								gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
								gap: spacing.sm,
							}}
						>
							<button
								type="button"
								on={{ click: closeTransactionModal }}
								css={{
									...modalButtonCss(colors.surface, colors.text, colors.border),
									border: `2px solid ${colors.border}`,
								}}
							>
								Cancel
							</button>
							<button
								type="button"
								disabled={transactionState.status === 'saving'}
								on={{ click: () => void submitTransaction('add') }}
								css={modalButtonCss('#86efac', '#052e16', '#16a34a')}
							>
								Add
							</button>
							<button
								type="button"
								disabled={transactionState.status === 'saving'}
								on={{ click: () => void submitTransaction('remove') }}
								css={modalButtonCss('#fecaca', '#450a0a', '#dc2626')}
							>
								Remove
							</button>
						</div>
					</section>
				</div>
			) : null}

			{transferState ? (
				<div
					on={{
						click: (event) => {
							if (event.target === event.currentTarget) {
								closeTransferModal()
							}
						},
					}}
					css={{
						position: 'fixed',
						inset: 0,
						backgroundColor: 'rgba(0, 0, 0, 0.45)',
						display: 'grid',
						placeItems: 'center',
						padding: spacing.md,
						zIndex: 1000,
						pointerEvents: transferModalClosing ? 'none' : 'auto',
						animation: transferModalClosing
							? `modal-backdrop-out ${modalCloseAnimationDurationMs}ms ease-in forwards`
							: 'modal-backdrop-in 180ms ease-out forwards',
						[mq.mobile]: {
							padding: 0,
							placeItems: 'stretch',
						},
					}}
				>
					<section
						role="dialog"
						aria-modal="true"
						aria-labelledby="transfer-modal-title"
						aria-describedby="transfer-modal-description"
						on={{ keydown: handleTransferModalKeydown }}
						css={{
							width: 'min(34rem, 100%)',
							maxHeight: 'calc(100dvh - 2 * var(--spacing-md))',
							overflow: 'auto',
							display: 'grid',
							gap: spacing.md,
							padding: spacing.lg,
							fontFamily: typography.fontFamily,
							borderRadius: radius.xl,
							border: `3px solid ${colors.border}`,
							backgroundColor: colors.surface,
							boxShadow: shadows.lg,
							animation: transferModalClosing
								? `modal-close ${modalCloseAnimationDurationMs}ms ease-in forwards`
								: 'modal-pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
							[mq.mobile]: {
								width: '100%',
								maxHeight: '100dvh',
								minHeight: '100dvh',
								borderRadius: 0,
								border: 'none',
								gap: spacing.sm,
								padding: spacing.md,
							},
						}}
					>
						<header css={{ display: 'flex', justifyContent: 'space-between' }}>
							<div>
								<h3
									id="transfer-modal-title"
									css={{ margin: 0, color: colors.text }}
								>
									Transfer money
								</h3>
								<p
									id="transfer-modal-description"
									css={{ margin: 0, color: colors.textMuted }}
								>
									Move any amount from one account to another.
								</p>
							</div>
							<button
								id="transfer-modal-close"
								type="button"
								on={{ click: closeTransferModal }}
								css={{
									border: 'none',
									background: 'transparent',
									color: colors.textMuted,
									cursor: 'pointer',
								}}
							>
								Close
							</button>
						</header>

						<section
							css={{
								display: 'grid',
								gap: spacing.xs,
								padding: spacing.md,
								borderRadius: radius.lg,
								background: getAccountGradientBackground(
									transferState.fromAccount.colorToken,
								),
								color: '#ffffff',
							}}
						>
							<span css={{ fontSize: typography.fontSize.sm, opacity: 0.9 }}>
								From
							</span>
							<strong css={{ fontSize: typography.fontSize.lg }}>
								{transferState.fromKid.emoji} {transferState.fromKid.name} ·{' '}
								{transferState.fromAccount.name}
							</strong>
							<span css={{ opacity: 0.9 }}>
								Current balance:{' '}
								{formatCents(transferState.fromAccount.balanceCents)}
							</span>
						</section>

						<label css={{ display: 'grid', gap: spacing.xs }}>
							<span css={{ color: colors.text }}>To account</span>
							<select
								value={transferState.toAccountId}
								disabled={
									getTransferDestinationGroups(transferState, kids).length === 0
								}
								on={{
									change: (event) => {
										if (!(event.currentTarget instanceof HTMLSelectElement))
											return
										transferState!.toAccountId = event.currentTarget.value
										transferState!.error = null
										handle.update()
									},
								}}
								css={inputCss}
							>
								{getTransferDestinationGroups(transferState, kids).map(
									(group) => (
										<optgroup
											key={group.kid.id}
											label={`${group.kid.emoji} ${group.kid.name}`}
										>
											{group.accounts.map((account) => (
												<option key={account.id} value={String(account.id)}>
													{account.name} ({formatCents(account.balanceCents)})
												</option>
											))}
										</optgroup>
									),
								)}
							</select>
							<span
								css={{
									color: colors.textMuted,
									fontSize: typography.fontSize.sm,
								}}
							>
								Accounts for {transferState.fromKid.name} are listed first;
								other kids are available below.
							</span>
						</label>

						<label css={{ display: 'grid', gap: spacing.xs }}>
							<span css={{ color: colors.text }}>Amount</span>
							<input
								type="number"
								min="0"
								step="0.01"
								value={transferState.amount}
								on={{
									input: (event) => {
										if (!(event.currentTarget instanceof HTMLInputElement))
											return
										transferState!.amount = event.currentTarget.value
										transferState!.error = null
										handle.update()
									},
								}}
								css={inputCss}
							/>
						</label>

						<div css={{ display: 'grid', gap: spacing.xs }}>
							<span
								css={{
									color: colors.textMuted,
									fontSize: typography.fontSize.sm,
								}}
							>
								Quick amounts
							</span>
							<div
								css={{
									display: 'grid',
									gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
									gap: spacing.xs,
								}}
							>
								<button
									type="button"
									disabled={
										Math.abs(transferState.fromAccount.balanceCents) === 0
									}
									on={{
										click: () =>
											setTransferAmountFromQuick(
												Math.abs(transferState!.fromAccount.balanceCents),
											),
									}}
									css={quickAmountButtonCss()}
								>
									{`Current Total (${formatCents(
										transferState.fromAccount.balanceCents,
									)})`}
								</button>
								{quickAmounts.map((amount) => (
									<button
										key={amount}
										type="button"
										on={{ click: () => setTransferAmountFromQuick(amount) }}
										css={quickAmountButtonCss()}
									>
										{formatCents(amount)}
									</button>
								))}
							</div>
						</div>

						<label css={{ display: 'grid', gap: spacing.xs }}>
							<span css={{ color: colors.text }}>Note (optional)</span>
							<input
								type="text"
								value={transferState.note}
								on={{
									input: (event) => {
										if (!(event.currentTarget instanceof HTMLInputElement))
											return
										transferState!.note = event.currentTarget.value
										handle.update()
									},
								}}
								css={inputCss}
							/>
						</label>

						{transferState.error ? (
							<p css={{ margin: 0, color: colors.error }}>
								{transferState.error}
							</p>
						) : null}

						<div
							css={{
								display: 'grid',
								gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
								gap: spacing.sm,
							}}
						>
							<button
								type="button"
								on={{ click: closeTransferModal }}
								css={{
									...modalButtonCss(colors.surface, colors.text, colors.border),
									border: `2px solid ${colors.border}`,
								}}
							>
								Cancel
							</button>
							<button
								type="button"
								disabled={transferState.status === 'saving'}
								on={{ click: () => void submitTransfer() }}
								css={modalButtonCss('#bfdbfe', '#172554', '#2563eb')}
							>
								Transfer
							</button>
						</div>
					</section>
				</div>
			) : null}
		</section>
	)
}

export const Component = HomeRoute

export function getMetadata() {
	return { title: null }
}

function isAuthError(errorMessage: string) {
	const normalizedErrorMessage = errorMessage.toLowerCase()
	return (
		normalizedErrorMessage.includes('(401)') ||
		normalizedErrorMessage.includes('(403)') ||
		normalizedErrorMessage.includes('unauthorized') ||
		normalizedErrorMessage.includes('not authenticated')
	)
}

function modalButtonCss(
	background: string,
	color: string,
	activeShadow: string,
) {
	return {
		...buttonCss,
		background,
		color,
		boxShadow: `0 4px 0 0 ${activeShadow}`,
		'&:active': {
			transform: 'translateY(4px)',
			boxShadow: `0 0 0 0 ${activeShadow}`,
		},
	}
}

function quickAmountButtonCss() {
	return {
		...buttonCss,
		backgroundColor: colors.surface,
		color: colors.text,
		border: `2px solid ${colors.border}`,
		boxShadow: `0 2px 0 0 ${colors.border}`,
		'&:active': {
			transform: 'translateY(2px)',
			boxShadow: `0 0 0 0 ${colors.border}`,
		},
	}
}

function getDefaultTransferDestination(
	kid: KidSummary,
	account: KidAccount,
	kids: Array<KidSummary>,
) {
	const sameKidAccount = kid.accounts.find((candidate) => {
		return candidate.id !== account.id
	})
	if (sameKidAccount) return sameKidAccount
	for (const candidateKid of kids) {
		if (candidateKid.id === kid.id) continue
		const destination = candidateKid.accounts.find((candidate) => {
			return candidate.id !== account.id
		})
		if (destination) return destination
	}
	return null
}

function getTransferDestinationGroups(
	transferState: TransferState,
	kids: Array<KidSummary>,
) {
	const groups = kids
		.map((kid) => ({
			kid,
			accounts: kid.accounts.filter((account) => {
				return account.id !== transferState.fromAccount.id
			}),
		}))
		.filter((group) => group.accounts.length > 0)
	const sameKidGroups = groups.filter((group) => {
		return group.kid.id === transferState.fromKid.id
	})
	const otherKidGroups = groups.filter((group) => {
		return group.kid.id !== transferState.fromKid.id
	})
	return [...sameKidGroups, ...otherKidGroups]
}

function LoggedOutHome() {
	return (
		<section
			css={{
				display: 'grid',
				gap: spacing.lg,
			}}
		>
			<section
				css={{
					padding: spacing.lg,
					borderRadius: radius.xl,
					border: `3px solid ${colors.border}`,
					backgroundColor: colors.surface,
					boxShadow: shadows.md,
					display: 'grid',
					gap: spacing.md,
				}}
			>
				<img
					src="/logo.png"
					alt="kids-ledger logo"
					css={{ width: '240px', maxWidth: '100%', height: 'auto' }}
				/>
				<h2 css={{ margin: 0, color: colors.text }}>
					A money tracker for kids
				</h2>
				<p css={{ margin: 0, color: colors.textMuted }}>
					Track allowances, chores, and spending with simple balances each kid
					can understand at a glance.
				</p>
				<div css={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
					<a
						href="/signup"
						css={{
							...buttonCss,
							textDecoration: 'none',
							display: 'inline-flex',
							alignItems: 'center',
							justifyContent: 'center',
						}}
					>
						Create account
					</a>
					<a
						href="/login"
						css={{
							...buttonCss,
							backgroundColor: colors.surface,
							color: colors.text,
							border: `2px solid ${colors.border}`,
							boxShadow: `0 2px 0 0 ${colors.border}`,
							textDecoration: 'none',
							display: 'inline-flex',
							alignItems: 'center',
							justifyContent: 'center',
							'&:active': {
								transform: 'translateY(2px)',
								boxShadow: `0 0 0 0 ${colors.border}`,
							},
						}}
					>
						Log in
					</a>
				</div>
			</section>

			<section
				css={{
					display: 'grid',
					gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))',
					gap: spacing.md,
				}}
			>
				<article
					css={{
						padding: spacing.md,
						borderRadius: radius.lg,
						border: `2px solid ${colors.border}`,
						backgroundColor: colors.surface,
					}}
				>
					<h3
						css={{ marginTop: 0, marginBottom: spacing.xs, color: colors.text }}
					>
						Quick family overview
					</h3>
					<p css={{ margin: 0, color: colors.textMuted }}>
						See each kid&apos;s total and account balances in one place.
					</p>
				</article>
				<article
					css={{
						padding: spacing.md,
						borderRadius: radius.lg,
						border: `2px solid ${colors.border}`,
						backgroundColor: colors.surface,
					}}
				>
					<h3
						css={{ marginTop: 0, marginBottom: spacing.xs, color: colors.text }}
					>
						Fast adjustments
					</h3>
					<p css={{ margin: 0, color: colors.textMuted }}>
						Add or remove money with quick amounts and optional notes.
					</p>
				</article>
				<article
					css={{
						padding: spacing.md,
						borderRadius: radius.lg,
						border: `2px solid ${colors.border}`,
						backgroundColor: colors.surface,
					}}
				>
					<h3
						css={{ marginTop: 0, marginBottom: spacing.xs, color: colors.text }}
					>
						History and settings
					</h3>
					<p css={{ margin: 0, color: colors.textMuted }}>
						Review transaction history and manage kids, accounts, and quick
						amounts.
					</p>
				</article>
			</section>
		</section>
	)
}
