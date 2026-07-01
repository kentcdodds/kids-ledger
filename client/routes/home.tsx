import { css, on, type Handle } from 'remix/ui'
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
	fromAccountId: string
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
		clearTransferCloseModalTimeout()
		transferState = null
		transferModalClosing = false
		transferModalOpener = null
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

	function openTransferModal(opener: HTMLButtonElement) {
		clearTransferCloseModalTimeout()
		clearCloseModalTimeout()
		transactionState = null
		transactionModalClosing = false
		transactionModalOpener = null
		removeTransactionModalStyles()
		transferModalOpener = opener
		transferModalClosing = false
		const source = getDefaultTransferSource(kids)
		const destination = source
			? getDefaultTransferDestination(source.account, source.kid, kids)
			: null
		if (source) {
			setKidModalBackground(source.kid.emoji)
		}
		transferState = {
			fromAccountId: source ? String(source.account.id) : '',
			toAccountId: destination ? String(destination.id) : '',
			amount: '',
			note: '',
			status: 'idle',
			error: destination
				? null
				: 'Add at least two accounts before transferring.',
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

	function setTransferSource(rawAccountId: string) {
		if (!transferState) return
		const source = getTransferAccountOptionById(kids, rawAccountId)
		transferState.fromAccountId = rawAccountId
		transferState.toAccountId = source
			? String(
					getDefaultTransferDestination(source.account, source.kid, kids)?.id ??
						'',
				)
			: ''
		transferState.error = null
		if (source) {
			setKidModalBackground(source.kid.emoji)
		}
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
		const fromAccountId = Number(transferState.fromAccountId)
		if (!Number.isInteger(fromAccountId) || fromAccountId < 1) {
			transferState.error = 'Choose a source account.'
			handle.update()
			return
		}
		const toAccountId = Number(transferState.toAccountId)
		if (!Number.isInteger(toAccountId) || toAccountId < 1) {
			transferState.error = 'Choose a destination account.'
			handle.update()
			return
		}
		if (toAccountId === fromAccountId) {
			transferState.error = 'Choose two different accounts.'
			handle.update()
			return
		}
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
		<section mix={css({ display: 'grid', gap: spacing.lg })}>
			{status === 'ready' ? (
				<header
					mix={css({
						display: 'grid',
						gap: spacing.sm,
						justifyItems: 'center',
						textAlign: 'center',
					})}
				>
					<h1 mix={css({ margin: 0, color: colors.text })}>Family Ledger</h1>
					<p mix={css({ margin: 0, color: colors.textMuted })}>
						Family Total:{' '}
						<strong mix={css({ color: colors.text })}>
							{formatCents(familyBalance)}
						</strong>
					</p>
				</header>
			) : null}

			{status === 'loading' ? (
				<p mix={css({ color: colors.textMuted })}>Loading your ledger...</p>
			) : null}
			{status === 'error' && needsLogin ? LoggedOutHome() : null}
			{status === 'error' && !needsLogin ? (
				<p mix={css({ color: colors.error })}>{errorMessage}</p>
			) : null}
			{status === 'ready' && kids.length === 0 ? (
				<section
					mix={css({
						padding: spacing.lg,
						border: `3px dashed ${colors.border}`,
						borderRadius: radius.xl,
						backgroundColor: colors.surface,
						display: 'grid',
						gap: spacing.sm,
					})}
				>
					<h2 mix={css({ margin: 0, color: colors.text })}>No kids yet</h2>
					<p mix={css({ margin: 0, color: colors.textMuted })}>
						Open <a href="/settings">Settings</a> to add your first kid and
						account.
					</p>
				</section>
			) : null}

			{kids.map((kid) => (
				<article
					key={kid.id}
					mix={css({
						display: 'grid',
						gap: spacing.md,
						padding: spacing.lg,
						borderRadius: radius.xl,
						border: `3px solid ${colors.border}`,
						backgroundColor: colors.surface,
						boxShadow: shadows.md,
					})}
				>
					<header
						mix={css({
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							gap: spacing.md,
						})}
					>
						<div>
							<h2 mix={css({ margin: 0, color: colors.text })}>
								{kid.emoji} {kid.name}
							</h2>
							<p mix={css({ margin: 0, color: colors.textMuted })}>
								Total: {formatCents(kid.totalBalanceCents)}
							</p>
						</div>
					</header>
					<div mix={css({ display: 'grid', gap: spacing.sm })}>
						{kid.accounts.length === 0 ? (
							<p mix={css({ margin: 0, color: colors.textMuted })}>
								No accounts yet. <a href="/settings">Add one in settings.</a>
							</p>
						) : null}
						{kid.accounts.map((account) => {
							const interestPreviewText = getInterestPreviewText(account)
							return (
								<article
									key={account.id}
									mix={css({
										display: 'grid',
										gridTemplateColumns: '1fr',
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
									})}
								>
									<button
										type="button"
										mix={[
											css({
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
											}),
											on('click', (event) => {
												if (!(event.currentTarget instanceof HTMLButtonElement))
													return
												openTransactionModal(kid, account, event.currentTarget)
											}),
										]}
									>
										<span
											mix={css({
												display: 'grid',
												gap: 2,
												minWidth: 0,
												fontWeight: typography.fontWeight.semibold,
											})}
										>
											{account.name}
											<span
												mix={css({
													fontSize: typography.fontSize.sm,
													opacity: 0.9,
												})}
											>
												Tap to add or remove money
											</span>
											{interestPreviewText ? (
												<span
													mix={css({
														fontSize: typography.fontSize.sm,
														fontWeight: typography.fontWeight.normal,
														opacity: 0.9,
													})}
												>
													{interestPreviewText}
												</span>
											) : null}
										</span>
										<strong
											mix={css({
												flexShrink: 0,
												fontSize: typography.fontSize.lg,
											})}
										>
											{formatCents(account.balanceCents)}
										</strong>
									</button>
								</article>
							)
						})}
					</div>
				</article>
			))}

			{status === 'ready' ? (
				<section
					mix={css({
						display: 'grid',
						gap: spacing.sm,
						padding: spacing.lg,
						borderRadius: radius.xl,
						border: `3px solid ${colors.border}`,
						backgroundColor: colors.surface,
						boxShadow: shadows.md,
						textAlign: 'center',
					})}
				>
					<h2 mix={css({ margin: 0, color: colors.text })}>
						Move money around
					</h2>
					<p mix={css({ margin: 0, color: colors.textMuted })}>
						Transfer between any two accounts. Same-kid accounts are suggested
						first.
					</p>
					<button
						type="button"
						disabled={getTransferAccountOptions(kids).length < 2}
						mix={[
							css({
								...buttonCss,
								justifySelf: 'center',
								minWidth: 'min(100%, 18rem)',
								paddingInline: spacing.lg,
							}),
							on('click', (event) => {
								if (!(event.currentTarget instanceof HTMLButtonElement)) return
								openTransferModal(event.currentTarget)
							}),
						]}
					>
						Transfer money
					</button>
				</section>
			) : null}

			{transactionState ? (
				<div
					mix={[
						css({
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
						}),
						on('click', (event) => {
							if (event.target === event.currentTarget) {
								closeTransactionModal()
							}
						}),
					]}
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
						mix={[
							css({
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
							}),
							on('keydown', handleTransactionModalKeydown),
						]}
					>
						<header
							mix={css({ display: 'flex', justifyContent: 'space-between' })}
						>
							<div>
								<h3
									id="transaction-modal-title"
									mix={css({ margin: 0, color: colors.text })}
								>
									{transactionState.kid.emoji} {transactionState.kid.name}
								</h3>
								<p
									id="transaction-modal-description"
									mix={css({ margin: 0, color: colors.textMuted })}
								>
									{transactionState.account.name} ·{' '}
									{formatCents(transactionState.account.balanceCents)}
								</p>
							</div>
							<button
								id="transaction-modal-close"
								type="button"
								mix={[
									css({
										border: 'none',
										background: 'transparent',
										color: colors.textMuted,
										cursor: 'pointer',
									}),
									on('click', closeTransactionModal),
								]}
							>
								Close
							</button>
						</header>

						<label mix={css({ display: 'grid', gap: spacing.xs })}>
							<span mix={css({ color: colors.text })}>Amount</span>
							<input
								type="number"
								min="0"
								step="0.01"
								value={transactionState.amount}
								mix={[
									css(inputCss),
									on('input', (event) => {
										if (!(event.currentTarget instanceof HTMLInputElement))
											return
										transactionState!.amount = event.currentTarget.value
										transactionState!.error = null
										handle.update()
									}),
								]}
							/>
						</label>

						<div mix={css({ display: 'grid', gap: spacing.xs })}>
							<span
								mix={css({
									color: colors.textMuted,
									fontSize: typography.fontSize.sm,
								})}
							>
								Quick amounts
							</span>
							<div
								mix={css({
									display: 'grid',
									gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
									gap: spacing.xs,
								})}
							>
								<button
									type="button"
									disabled={
										Math.abs(transactionState!.account.balanceCents) === 0
									}
									mix={[
										css(quickAmountButtonCss()),
										on('click', () =>
											setTransactionAmountFromQuick(
												Math.abs(transactionState!.account.balanceCents),
											),
										),
									]}
								>
									{`Current Total (${formatCents(
										transactionState.account.balanceCents,
									)})`}
								</button>
								{quickAmounts.map((amount) => (
									<button
										key={amount}
										type="button"
										mix={[
											css(quickAmountButtonCss()),
											on('click', () => setTransactionAmountFromQuick(amount)),
										]}
									>
										{formatCents(amount)}
									</button>
								))}
							</div>
						</div>

						<label mix={css({ display: 'grid', gap: spacing.xs })}>
							<span mix={css({ color: colors.text })}>Note (optional)</span>
							<input
								type="text"
								value={transactionState.note}
								mix={[
									css(inputCss),
									on('input', (event) => {
										if (!(event.currentTarget instanceof HTMLInputElement))
											return
										transactionState!.note = event.currentTarget.value
										handle.update()
									}),
								]}
							/>
						</label>

						{transactionState.error ? (
							<p mix={css({ margin: 0, color: colors.error })}>
								{transactionState.error}
							</p>
						) : null}
						{transactionState.warning ? (
							<p mix={css({ margin: 0, color: '#b45309' })}>
								{transactionState.warning}
							</p>
						) : null}

						<div
							mix={css({
								display: 'grid',
								gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
								gap: spacing.sm,
							})}
						>
							<button
								type="button"
								mix={[
									css({
										...modalButtonCss(
											colors.surface,
											colors.text,
											colors.border,
										),
										border: `2px solid ${colors.border}`,
									}),
									on('click', closeTransactionModal),
								]}
							>
								Cancel
							</button>
							<button
								type="button"
								disabled={transactionState.status === 'saving'}
								mix={[
									css(modalButtonCss('#86efac', '#052e16', '#16a34a')),
									on('click', () => void submitTransaction('add')),
								]}
							>
								Add
							</button>
							<button
								type="button"
								disabled={transactionState.status === 'saving'}
								mix={[
									css(modalButtonCss('#fecaca', '#450a0a', '#dc2626')),
									on('click', () => void submitTransaction('remove')),
								]}
							>
								Remove
							</button>
						</div>
					</section>
				</div>
			) : null}

			{transferState ? (
				<div
					mix={[
						css({
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
						}),
						on('click', (event) => {
							if (event.target === event.currentTarget) {
								closeTransferModal()
							}
						}),
					]}
				>
					<section
						role="dialog"
						aria-modal="true"
						aria-labelledby="transfer-modal-title"
						aria-describedby="transfer-modal-description"
						mix={[
							css({
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
							}),
							on('keydown', handleTransferModalKeydown),
						]}
					>
						<header
							mix={css({ display: 'flex', justifyContent: 'space-between' })}
						>
							<div>
								<h3
									id="transfer-modal-title"
									mix={css({ margin: 0, color: colors.text })}
								>
									Transfer money
								</h3>
								<p
									id="transfer-modal-description"
									mix={css({ margin: 0, color: colors.textMuted })}
								>
									Move any amount from one account to another.
								</p>
							</div>
							<button
								id="transfer-modal-close"
								type="button"
								mix={[
									css({
										border: 'none',
										background: 'transparent',
										color: colors.textMuted,
										cursor: 'pointer',
									}),
									on('click', closeTransferModal),
								]}
							>
								Close
							</button>
						</header>

						<label mix={css({ display: 'grid', gap: spacing.xs })}>
							<span mix={css({ color: colors.text })}>From account</span>
							<select
								value={transferState.fromAccountId}
								disabled={getTransferAccountOptions(kids).length === 0}
								mix={[
									css(inputCss),
									on('change', (event) => {
										if (!(event.currentTarget instanceof HTMLSelectElement))
											return
										setTransferSource(event.currentTarget.value)
									}),
								]}
							>
								{getTransferAccountGroups(kids).map((group) => (
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
								))}
							</select>
							<span
								mix={css({
									color: colors.textMuted,
									fontSize: typography.fontSize.sm,
								})}
							>
								{getSelectedTransferSourceBalanceLabel(transferState, kids)}
							</span>
						</label>

						<label mix={css({ display: 'grid', gap: spacing.xs })}>
							<span mix={css({ color: colors.text })}>To account</span>
							<select
								value={transferState.toAccountId}
								disabled={
									getTransferDestinationGroups(transferState, kids).length === 0
								}
								mix={[
									css(inputCss),
									on('change', (event) => {
										if (!(event.currentTarget instanceof HTMLSelectElement))
											return
										transferState!.toAccountId = event.currentTarget.value
										transferState!.error = null
										handle.update()
									}),
								]}
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
								mix={css({
									color: colors.textMuted,
									fontSize: typography.fontSize.sm,
								})}
							>
								Accounts for{' '}
								{getSelectedTransferSource(transferState, kids)?.kid.name ??
									'the selected kid'}{' '}
								are listed first; other kids are available below.
							</span>
						</label>

						<label mix={css({ display: 'grid', gap: spacing.xs })}>
							<span mix={css({ color: colors.text })}>Amount</span>
							<input
								type="number"
								min="0"
								step="0.01"
								value={transferState.amount}
								mix={[
									css(inputCss),
									on('input', (event) => {
										if (!(event.currentTarget instanceof HTMLInputElement))
											return
										transferState!.amount = event.currentTarget.value
										transferState!.error = null
										handle.update()
									}),
								]}
							/>
						</label>

						<div mix={css({ display: 'grid', gap: spacing.xs })}>
							<span
								mix={css({
									color: colors.textMuted,
									fontSize: typography.fontSize.sm,
								})}
							>
								Quick amounts
							</span>
							<div
								mix={css({
									display: 'grid',
									gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
									gap: spacing.xs,
								})}
							>
								<button
									type="button"
									disabled={
										getTransferAvailableBalanceCents(transferState, kids) === 0
									}
									mix={[
										css(quickAmountButtonCss()),
										on('click', () =>
											setTransferAmountFromQuick(
												getTransferAvailableBalanceCents(transferState!, kids),
											),
										),
									]}
								>
									{`Current Total (${formatCents(
										getTransferAvailableBalanceCents(transferState, kids),
									)})`}
								</button>
								{quickAmounts.map((amount) => (
									<button
										key={amount}
										type="button"
										mix={[
											css(quickAmountButtonCss()),
											on('click', () => setTransferAmountFromQuick(amount)),
										]}
									>
										{formatCents(amount)}
									</button>
								))}
							</div>
						</div>

						<label mix={css({ display: 'grid', gap: spacing.xs })}>
							<span mix={css({ color: colors.text })}>Note (optional)</span>
							<input
								type="text"
								value={transferState.note}
								mix={[
									css(inputCss),
									on('input', (event) => {
										if (!(event.currentTarget instanceof HTMLInputElement))
											return
										transferState!.note = event.currentTarget.value
										handle.update()
									}),
								]}
							/>
						</label>

						{transferState.error ? (
							<p mix={css({ margin: 0, color: colors.error })}>
								{transferState.error}
							</p>
						) : null}

						<div
							mix={css({
								display: 'grid',
								gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
								gap: spacing.sm,
							})}
						>
							<button
								type="button"
								mix={[
									css({
										...modalButtonCss(
											colors.surface,
											colors.text,
											colors.border,
										),
										border: `2px solid ${colors.border}`,
									}),
									on('click', closeTransferModal),
								]}
							>
								Cancel
							</button>
							<button
								type="button"
								disabled={transferState.status === 'saving'}
								mix={[
									css(modalButtonCss('#bfdbfe', '#172554', '#2563eb')),
									on('click', () => void submitTransfer()),
								]}
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

function getTransferAccountOptions(kids: Array<KidSummary>) {
	return kids.flatMap((kid) => {
		return kid.accounts.map((account) => ({ kid, account }))
	})
}

function getTransferAccountGroups(kids: Array<KidSummary>) {
	return kids
		.map((kid) => ({ kid, accounts: kid.accounts }))
		.filter((group) => group.accounts.length > 0)
}

function getDefaultTransferSource(kids: Array<KidSummary>) {
	return (
		getTransferAccountOptions(kids).find((option) => {
			return option.account.balanceCents > 0
		}) ??
		getTransferAccountOptions(kids)[0] ??
		null
	)
}

function getTransferAccountOptionById(
	kids: Array<KidSummary>,
	rawAccountId: string,
) {
	const accountId = Number(rawAccountId)
	if (!Number.isInteger(accountId)) return null
	return (
		getTransferAccountOptions(kids).find((option) => {
			return option.account.id === accountId
		}) ?? null
	)
}

function getSelectedTransferSource(
	transferState: TransferState,
	kids: Array<KidSummary>,
) {
	return getTransferAccountOptionById(kids, transferState.fromAccountId)
}

function getSelectedTransferSourceBalanceLabel(
	transferState: TransferState,
	kids: Array<KidSummary>,
) {
	const source = getSelectedTransferSource(transferState, kids)
	if (!source) return 'Choose the account to move money from.'
	return `Current balance: ${formatCents(source.account.balanceCents)}`
}

function getTransferAvailableBalanceCents(
	transferState: TransferState,
	kids: Array<KidSummary>,
) {
	return Math.max(
		getSelectedTransferSource(transferState, kids)?.account.balanceCents ?? 0,
		0,
	)
}

function getDefaultTransferDestination(
	account: KidAccount,
	kid: KidSummary,
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
	const source = getSelectedTransferSource(transferState, kids)
	if (!source) return []
	const groups = kids
		.map((kid) => ({
			kid,
			accounts: kid.accounts.filter((account) => {
				return account.id !== source.account.id
			}),
		}))
		.filter((group) => group.accounts.length > 0)
	const sameKidGroups = groups.filter((group) => {
		return group.kid.id === source.kid.id
	})
	const otherKidGroups = groups.filter((group) => {
		return group.kid.id !== source.kid.id
	})
	return [...sameKidGroups, ...otherKidGroups]
}

function LoggedOutHome() {
	return (
		<section
			mix={css({
				display: 'grid',
				gap: spacing.lg,
			})}
		>
			<section
				mix={css({
					padding: spacing.lg,
					borderRadius: radius.xl,
					border: `3px solid ${colors.border}`,
					backgroundColor: colors.surface,
					boxShadow: shadows.md,
					display: 'grid',
					gap: spacing.md,
				})}
			>
				<img
					src="/logo.png"
					alt="kids-ledger logo"
					mix={css({ width: '240px', maxWidth: '100%', height: 'auto' })}
				/>
				<h2 mix={css({ margin: 0, color: colors.text })}>
					A money tracker for kids
				</h2>
				<p mix={css({ margin: 0, color: colors.textMuted })}>
					Track allowances, chores, and spending with simple balances each kid
					can understand at a glance.
				</p>
				<div mix={css({ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' })}>
					<a
						href="/signup"
						mix={css({
							...buttonCss,
							textDecoration: 'none',
							display: 'inline-flex',
							alignItems: 'center',
							justifyContent: 'center',
						})}
					>
						Create account
					</a>
					<a
						href="/login"
						mix={css({
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
						})}
					>
						Log in
					</a>
				</div>
			</section>

			<section
				mix={css({
					display: 'grid',
					gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))',
					gap: spacing.md,
				})}
			>
				<article
					mix={css({
						padding: spacing.md,
						borderRadius: radius.lg,
						border: `2px solid ${colors.border}`,
						backgroundColor: colors.surface,
					})}
				>
					<h3
						mix={css({
							marginTop: 0,
							marginBottom: spacing.xs,
							color: colors.text,
						})}
					>
						Quick family overview
					</h3>
					<p mix={css({ margin: 0, color: colors.textMuted })}>
						See each kid&apos;s total and account balances in one place.
					</p>
				</article>
				<article
					mix={css({
						padding: spacing.md,
						borderRadius: radius.lg,
						border: `2px solid ${colors.border}`,
						backgroundColor: colors.surface,
					})}
				>
					<h3
						mix={css({
							marginTop: 0,
							marginBottom: spacing.xs,
							color: colors.text,
						})}
					>
						Fast adjustments
					</h3>
					<p mix={css({ margin: 0, color: colors.textMuted })}>
						Add or remove money with quick amounts and optional notes.
					</p>
				</article>
				<article
					mix={css({
						padding: spacing.md,
						borderRadius: radius.lg,
						border: `2px solid ${colors.border}`,
						backgroundColor: colors.surface,
					})}
				>
					<h3
						mix={css({
							marginTop: 0,
							marginBottom: spacing.xs,
							color: colors.text,
						})}
					>
						History and settings
					</h3>
					<p mix={css({ margin: 0, color: colors.textMuted })}>
						Review transaction history and manage kids, accounts, and quick
						amounts.
					</p>
				</article>
			</section>
		</section>
	)
}
