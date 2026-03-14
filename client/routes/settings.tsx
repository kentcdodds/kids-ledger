import { type Handle } from 'remix/component'
import {
	archiveAccount,
	archiveKid,
	createAccount,
	createKid,
	deleteAccount,
	deleteKid,
	fetchSettings,
	reorderAccounts,
	reorderKids,
	setQuickAmounts,
	unarchiveAccount,
	unarchiveKid,
	updateAccount,
	updateKid,
	type KidSummary,
} from '#client/ledger-api.ts'
import {
	clearKidModalBackground,
	setKidModalBackground,
} from '#client/kid-modal-background.ts'
import { formatCents } from '#client/money.ts'
import {
	accountColorTokens,
	getAccountGradientBackground,
} from '#client/styles/account-colors.ts'
import {
	colors,
	radius,
	shadows,
	spacing,
	typography,
	mq,
} from '#client/styles/tokens.ts'
import { inputCss, buttonCss } from '#client/styles/form-controls.ts'
import { buildTransactionModalCss } from '#client/styles/transaction-modal-css.ts'
import { transactionModalCssVariables } from '#shared/transaction-modal-css.ts'
import { handleModalKeydown } from '#client/dom-utils.ts'

const defaultKidEmojis = [
	'🧒',
	'👦',
	'👧',
	'🧑',
	'🙂',
	'😊',
	'😄',
	'😁',
	'😎',
	'🤓',
	'🥳',
	'🤠',
	'🦖',
	'🦕',
	'🦄',
	'🐶',
	'🐱',
	'🐼',
	'🐨',
	'🦊',
	'🐸',
	'🐧',
	'🦁',
	'🐯',
	'🐵',
	'🐙',
	'🐢',
	'🦋',
	'🚀',
	'⭐',
] as const

function getRandomDefaultKidEmoji() {
	return defaultKidEmojis[Math.floor(Math.random() * defaultKidEmojis.length)]!
}

function getAccountTextColors(colorToken: string) {
	if (colorToken === 'sun') {
		return {
			text: colors.text,
			muted: colors.textMuted,
		}
	}
	return {
		text: '#ffffff',
		muted: 'rgba(255, 255, 255, 0.9)',
	}
}

function moveItem<T>(items: Array<T>, from: number, to: number) {
	const nextItems = [...items]
	nextItems.splice(to, 0, nextItems.splice(from, 1)[0]!)
	return nextItems
}

type ReorderDirection = 'up' | 'down'

function TrashIcon(_handle: Handle) {
	return () => (
		<svg
			viewBox="0 0 24 24"
			width="18"
			height="18"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d="M3 6h18" />
			<path d="M8 6V4h8v2" />
			<path d="M19 6l-1 14H6L5 6" />
			<path d="M10 11v6" />
			<path d="M14 11v6" />
		</svg>
	)
}

function SettingsIcon(_handle: Handle) {
	return () => (
		<svg
			viewBox="0 0 24 24"
			width="18"
			height="18"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<circle cx="12" cy="12" r="3" />
			<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.08a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.08a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
		</svg>
	)
}

const transactionModalCssFontExample = `--font-family: "Comic Sans MS", "Comic Sans", cursive;`
const transactionModalCssGoogleFontExample = `@import url("https://fonts.googleapis.com/css2?family=MedievalSharp&display=swap");

:root {
	--font-family: "MedievalSharp", cursive;
}`
const modalCloseAnimationDurationMs = 220

type SettingsState =
	| { status: 'loading' | 'error'; message: string; kids: Array<KidSummary> }
	| {
			status: 'ready'
			message: string
			kids: Array<KidSummary>
			archived: {
				kids: Array<{
					id: number
					name: string
					emoji: string
					sortOrder: number
				}>
				accounts: Array<{
					id: number
					name: string
					colorToken: string
					sortOrder: number
					kidId: number
					kidName: string
				}>
			}
			quickAmounts: Array<number>
	  }

export function SettingsRoute(handle: Handle) {
	let state: SettingsState = { status: 'loading', message: '', kids: [] }
	let isRefreshing = false
	let isReordering = false
	let newKidName = ''
	let newKidEmoji: string = getRandomDefaultKidEmoji()
	let newAccountColorsByKidId: Record<number, string> = {}
	let editingKidTransactionModalCss: {
		kidId: number
		kidName: string
		kidEmoji: string
	} | null = null
	let transactionModalCssOpener: HTMLElement | null = null
	let transactionModalCssDraft = ''
	let transactionModalCssSaveError: string | null = null
	let transactionModalCssSaving = false
	let transactionModalCssClosing = false
	let closeTransactionModalCssTimeoutId: number | null = null

	function removeTransactionModalPreviewStyles() {
		if (typeof document === 'undefined') return
		for (const element of document.querySelectorAll(
			'style[data-kid-transaction-modal-preview-css]',
		)) {
			element.remove()
		}
	}

	function clearCloseTransactionModalCssTimeout() {
		if (closeTransactionModalCssTimeoutId === null) return
		window.clearTimeout(closeTransactionModalCssTimeoutId)
		closeTransactionModalCssTimeoutId = null
	}

	async function refreshSettings() {
		const hadReadyData = state.status === 'ready'
		isRefreshing = hadReadyData
		if (!hadReadyData) {
			state = { status: 'loading', message: '', kids: state.kids }
		}
		handle.update()
		try {
			const payload = await fetchSettings()
			state = {
				status: 'ready',
				message: '',
				kids: payload.settings.kids.filter((kid) => !kid.isArchived),
				archived: payload.settings.archived,
				quickAmounts: payload.settings.quickAmounts,
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : 'Failed to load settings.'
			if (state.status === 'ready') {
				state.message = errorMessage
			} else {
				state = {
					status: 'error',
					message: errorMessage,
					kids: [],
				}
			}
		}
		isRefreshing = false
		handle.update()
	}

	handle.queueTask(async () => {
		await refreshSettings()
	})
	handle.queueTask(() => {
		return () => {
			clearCloseTransactionModalCssTimeout()
			removeTransactionModalPreviewStyles()
			clearKidModalBackground()
		}
	})

	function notify(message: string) {
		if (state.status !== 'ready') return
		state.message = message
		handle.update()
	}

	function updateLocalAccount(
		accountId: number,
		updates: { name?: string; colorToken?: string },
	) {
		if (state.status !== 'ready') return
		for (const kid of state.kids) {
			const account = kid.accounts.find((entry) => entry.id === accountId)
			if (!account) continue
			if (updates.name !== undefined) account.name = updates.name
			if (updates.colorToken !== undefined)
				account.colorToken = updates.colorToken
			handle.update()
			return
		}
	}

	function getCreateAccountColor(kidId: number) {
		return newAccountColorsByKidId[kidId] ?? 'orchid'
	}

	function queueReorderFocus(options: {
		scope: 'kid' | 'account'
		kidId: number
		accountId?: number
		direction: ReorderDirection
	}) {
		if (typeof document === 'undefined' || typeof window === 'undefined') return
		const accountSelector =
			options.scope === 'account'
				? `[data-reorder-account-id="${options.accountId}"]`
				: ''
		const selectorForDirection = (direction: ReorderDirection) =>
			`button[data-reorder-scope="${options.scope}"][data-reorder-kid-id="${options.kidId}"]${accountSelector}[data-reorder-direction="${direction}"]`
		const focusMatchingButton = () => {
			const preferredButton = document.querySelector(
				selectorForDirection(options.direction),
			)
			if (
				preferredButton instanceof HTMLButtonElement &&
				!preferredButton.disabled
			) {
				preferredButton.focus()
				return true
			}
			const fallbackDirection: ReorderDirection =
				options.direction === 'up' ? 'down' : 'up'
			const fallbackButton = document.querySelector(
				selectorForDirection(fallbackDirection),
			)
			if (
				fallbackButton instanceof HTMLButtonElement &&
				!fallbackButton.disabled
			) {
				fallbackButton.focus()
				return true
			}
			return false
		}
		let attempts = 0
		const maxAttempts = 8
		const tryFocus = () => {
			if (focusMatchingButton()) return
			attempts += 1
			if (attempts >= maxAttempts) return
			window.requestAnimationFrame(tryFocus)
		}
		window.requestAnimationFrame(tryFocus)
	}

	function openTransactionModalCssEditor(kid: KidSummary) {
		clearCloseTransactionModalCssTimeout()
		removeTransactionModalPreviewStyles()
		setKidModalBackground(kid.emoji)
		if (typeof document === 'undefined') {
			transactionModalCssOpener = null
		} else {
			const activeElement = document.activeElement
			transactionModalCssOpener =
				activeElement instanceof HTMLElement ? activeElement : null
		}
		editingKidTransactionModalCss = {
			kidId: kid.id,
			kidName: kid.name,
			kidEmoji: kid.emoji,
		}
		transactionModalCssDraft = kid.transactionModalCss
		transactionModalCssSaveError = null
		transactionModalCssSaving = false
		transactionModalCssClosing = false
		handle.update()
		handle.queueTask(() => {
			const cssInput = document.getElementById(
				'kid-transaction-modal-css-input',
			)
			if (cssInput instanceof HTMLTextAreaElement) {
				cssInput.focus()
			}
		})
	}

	function closeTransactionModalCssEditor() {
		if (
			transactionModalCssSaving ||
			!editingKidTransactionModalCss ||
			transactionModalCssClosing
		)
			return
		const opener = transactionModalCssOpener
		transactionModalCssOpener = null
		transactionModalCssClosing = true
		handle.update()
		closeTransactionModalCssTimeoutId = window.setTimeout(() => {
			editingKidTransactionModalCss = null
			transactionModalCssDraft = ''
			transactionModalCssSaveError = null
			transactionModalCssClosing = false
			closeTransactionModalCssTimeoutId = null
			removeTransactionModalPreviewStyles()
			clearKidModalBackground()
			handle.update()
			if (opener?.isConnected) {
				handle.queueTask(() => {
					opener.focus()
				})
			}
		}, modalCloseAnimationDurationMs)
	}

	function handleTransactionModalCssKeydown(event: KeyboardEvent) {
		handleModalKeydown(event, closeTransactionModalCssEditor)
	}

	async function saveTransactionModalCss() {
		if (state.status !== 'ready') return
		if (!editingKidTransactionModalCss || transactionModalCssSaving) return
		const { kidId } = editingKidTransactionModalCss
		const kid = state.kids.find((entry) => entry.id === kidId)
		if (!kid) return
		transactionModalCssSaving = true
		transactionModalCssSaveError = null
		handle.update()
		try {
			await updateKid({
				kidId: kid.id,
				name: kid.name,
				emoji: kid.emoji,
				transactionModalCss: transactionModalCssDraft,
			})
			clearCloseTransactionModalCssTimeout()
			const opener = transactionModalCssOpener
			editingKidTransactionModalCss = null
			transactionModalCssDraft = ''
			transactionModalCssClosing = false
			transactionModalCssOpener = null
			removeTransactionModalPreviewStyles()
			clearKidModalBackground()
			await refreshSettings()
			if (state.status === 'ready') {
				notify(`Saved transaction modal CSS for ${kid.name}.`)
			}
			if (opener?.isConnected) {
				handle.queueTask(() => {
					opener.focus()
				})
			}
		} catch (error) {
			transactionModalCssSaveError =
				error instanceof Error
					? error.message
					: 'Could not save transaction modal CSS.'
		}
		transactionModalCssSaving = false
		handle.update()
	}

	async function handleCreateKid() {
		if (state.status !== 'ready') return
		if (!newKidName.trim()) {
			notify('Kid name is required.')
			return
		}
		await createKid({ name: newKidName, emoji: newKidEmoji })
		newKidName = ''
		newKidEmoji = getRandomDefaultKidEmoji()
		await refreshSettings()
	}

	async function handleKidMove(kidId: number, delta: -1 | 1) {
		if (state.status !== 'ready' || isReordering) return
		const ids = state.kids.map((kid) => kid.id)
		const from = ids.indexOf(kidId)
		if (from < 0) return
		const to = from + delta
		if (to < 0 || to >= ids.length) return
		isReordering = true
		handle.update()
		try {
			await reorderKids(moveItem(ids, from, to))
			await refreshSettings()
			queueReorderFocus({
				scope: 'kid',
				kidId,
				direction: delta === -1 ? 'up' : 'down',
			})
		} catch (error) {
			notify(error instanceof Error ? error.message : 'Could not reorder kid.')
		} finally {
			isReordering = false
			handle.update()
		}
	}

	async function handleAccountMove(
		kidId: number,
		accountId: number,
		delta: -1 | 1,
	) {
		if (state.status !== 'ready' || isReordering) return
		const kid = state.kids.find((entry) => entry.id === kidId)
		if (!kid) return
		const accountIds = kid.accounts.map((account) => account.id)
		const from = accountIds.indexOf(accountId)
		if (from < 0) return
		const to = from + delta
		if (to < 0 || to >= accountIds.length) return
		isReordering = true
		handle.update()
		try {
			await reorderAccounts(kidId, moveItem(accountIds, from, to))
			await refreshSettings()
			queueReorderFocus({
				scope: 'account',
				kidId,
				accountId,
				direction: delta === -1 ? 'up' : 'down',
			})
		} catch (error) {
			notify(
				error instanceof Error ? error.message : 'Could not reorder account.',
			)
		} finally {
			isReordering = false
			handle.update()
		}
	}

	return () => (
		<section css={{ display: 'grid', gap: spacing.lg }}>
			<header css={{ display: 'grid', gap: spacing.xs }}>
				<h1 css={{ margin: 0, color: colors.text }}>Household Settings</h1>
				<p css={{ margin: 0, color: colors.textMuted }}>
					Manage kids and accounts. Use arrow buttons to reorder.
				</p>
			</header>

			{state.status === 'loading' ? (
				<p css={{ color: colors.textMuted }}>Loading settings...</p>
			) : null}
			{state.status === 'error' ? (
				<p css={{ color: colors.error }}>{state.message}</p>
			) : null}
			{isRefreshing ? (
				<p css={{ margin: 0, color: colors.textMuted }}>Saving changes...</p>
			) : null}

			{state.status === 'ready' ? (
				<>
					<section
						css={{
							display: 'grid',
							gap: spacing.sm,
							padding: spacing.md,
							border: `3px solid ${colors.border}`,
							borderRadius: radius.xl,
							backgroundColor: colors.surface,
							boxShadow: shadows.md,
						}}
					>
						<h2 css={{ margin: 0, color: colors.text }}>Add kid</h2>
						<div
							css={{
								display: 'grid',
								gridTemplateColumns: '4rem 1fr auto',
								gap: spacing.sm,
								[mq.mobile]: {
									gridTemplateColumns: '4rem 1fr',
									'& > button': {
										gridColumn: '1 / -1',
									},
								},
							}}
						>
							<input
								value={newKidEmoji}
								on={{
									input: (event) => {
										if (!(event.currentTarget instanceof HTMLInputElement))
											return
										newKidEmoji = event.currentTarget.value || '🧒'
										handle.update()
									},
								}}
								maxLength={2}
								aria-label="Kid emoji"
								css={{
									...inputCss,
									fontSize: typography.fontSize.xl,
									fontWeight: typography.fontWeight.bold,
									textAlign: 'center',
								}}
							/>
							<input
								value={newKidName}
								on={{
									input: (event) => {
										if (!(event.currentTarget instanceof HTMLInputElement))
											return
										newKidName = event.currentTarget.value
										handle.update()
									},
								}}
								placeholder="Kid name"
								css={{
									...inputCss,
									fontSize: typography.fontSize.xl,
									fontWeight: typography.fontWeight.bold,
								}}
							/>
							<button
								type="button"
								on={{ click: () => void handleCreateKid() }}
								css={buttonCss}
							>
								Add
							</button>
						</div>
					</section>

					<section css={{ display: 'grid', gap: spacing.md }}>
						{state.kids.map((kid, kidIndex) => (
							<article
								key={kid.id}
								css={{
									display: 'grid',
									gap: spacing.sm,
									padding: spacing.lg,
									border: `3px solid ${colors.border}`,
									borderRadius: radius.xl,
									backgroundColor: colors.surface,
									boxShadow: shadows.md,
								}}
							>
								<header
									css={{
										display: 'grid',
										gridTemplateColumns: 'auto 4rem 1fr auto',
										gap: spacing.sm,
										alignItems: 'center',
										[mq.mobile]: {
											gridTemplateColumns: 'auto 4rem 1fr auto',
											'& [data-kid-actions]': {
												gridColumn: '1 / -1',
											},
										},
									}}
								>
									<div css={reorderControlsCss}>
										<button
											type="button"
											data-reorder-scope="kid"
											data-reorder-kid-id={kid.id}
											data-reorder-direction="up"
											aria-label={`Move ${kid.name} up`}
											disabled={kidIndex === 0 || isReordering}
											on={{
												click: () => void handleKidMove(kid.id, -1),
											}}
											css={reorderButtonCss}
										>
											↑
										</button>
										<button
											type="button"
											data-reorder-scope="kid"
											data-reorder-kid-id={kid.id}
											data-reorder-direction="down"
											aria-label={`Move ${kid.name} down`}
											disabled={
												kidIndex === state.kids.length - 1 || isReordering
											}
											on={{
												click: () => void handleKidMove(kid.id, 1),
											}}
											css={reorderButtonCss}
										>
											↓
										</button>
									</div>
									<input
										defaultValue={kid.emoji}
										aria-label={`${kid.name} emoji`}
										data-kid-emoji={kid.id}
										maxLength={2}
										on={{
											blur: async (e) => {
												const emoji =
													(e.currentTarget as HTMLInputElement).value || '🧒'
												const nameInput = document.querySelector(
													`input[data-kid-name="${kid.id}"]`,
												) as HTMLInputElement
												const name = nameInput?.value || kid.name
												if (name === kid.name && emoji === kid.emoji) {
													return
												}
												await updateKid({
													kidId: kid.id,
													name,
													emoji,
												})
												await refreshSettings()
											},
										}}
										css={{
											...inputCss,
											fontSize: typography.fontSize.xl,
											fontWeight: typography.fontWeight.bold,
											textAlign: 'center',
										}}
									/>
									<input
										defaultValue={kid.name}
										aria-label={`${kid.name} name`}
										data-kid-name={kid.id}
										on={{
											blur: async (e) => {
												const name =
													(e.currentTarget as HTMLInputElement).value ||
													kid.name
												const emojiInput = document.querySelector(
													`input[data-kid-emoji="${kid.id}"]`,
												) as HTMLInputElement
												const emoji = emojiInput?.value || kid.emoji
												if (name === kid.name && emoji === kid.emoji) {
													return
												}
												await updateKid({
													kidId: kid.id,
													name,
													emoji,
												})
												await refreshSettings()
											},
										}}
										css={{
											...inputCss,
											fontSize: typography.fontSize.xl,
											fontWeight: typography.fontWeight.bold,
										}}
									/>
									<div
										data-kid-actions
										css={{
											display: 'flex',
											gap: spacing.xs,
											flexWrap: 'wrap',
											justifyContent: 'flex-end',
										}}
									>
										<button
											type="button"
											aria-label={`Customize ${kid.name}'s transaction modal`}
											title="Customize transaction modal"
											on={{
												click: () => {
													openTransactionModalCssEditor(kid)
												},
											}}
											css={transactionModalIconButtonCss}
										>
											<SettingsIcon />
										</button>
										<button
											type="button"
											aria-label={`Archive ${kid.name}`}
											on={{
												click: async () => {
													await archiveKid(kid.id)
													await refreshSettings()
												},
											}}
											css={archiveIconButtonCss}
										>
											<TrashIcon />
										</button>
									</div>
								</header>
								<p css={{ margin: 0, color: colors.textMuted }}>
									Total: {formatCents(kid.totalBalanceCents)}
								</p>
								<div
									css={{
										display: 'flex',
										flexDirection: 'column',
										backgroundColor: colors.surface,
										borderRadius: radius.lg,
										border:
											kid.accounts.length > 0
												? `2px solid ${colors.border}`
												: 'none',
										overflow: 'hidden',
									}}
								>
									{kid.accounts.map((account, index) => {
										const textColors = getAccountTextColors(account.colorToken)
										return (
											<div
												key={account.id}
												css={{
													display: 'grid',
													gridTemplateColumns: 'auto 1fr auto auto',
													rowGap: spacing.xs,
													columnGap: spacing.sm,
													alignItems: 'center',
													padding: spacing.md,
													background: getAccountGradientBackground(
														account.colorToken,
													),
													borderBottom:
														index < kid.accounts.length - 1
															? `1px solid ${colors.border}`
															: 'none',
													[mq.mobile]: {
														gridTemplateColumns: 'auto 1fr auto auto',
													},
												}}
											>
												<div css={reorderControlsCss}>
													<button
														type="button"
														data-reorder-scope="account"
														data-reorder-kid-id={kid.id}
														data-reorder-account-id={account.id}
														data-reorder-direction="up"
														aria-label={`Move ${account.name} up`}
														disabled={index === 0 || isReordering}
														on={{
															click: () =>
																void handleAccountMove(kid.id, account.id, -1),
														}}
														css={reorderButtonCss}
													>
														↑
													</button>
													<button
														type="button"
														data-reorder-scope="account"
														data-reorder-kid-id={kid.id}
														data-reorder-account-id={account.id}
														data-reorder-direction="down"
														aria-label={`Move ${account.name} down`}
														disabled={
															index === kid.accounts.length - 1 || isReordering
														}
														on={{
															click: () =>
																void handleAccountMove(kid.id, account.id, 1),
														}}
														css={reorderButtonCss}
													>
														↓
													</button>
												</div>
												<div
													css={{
														display: 'grid',
														gap: 2,
														[mq.mobile]: {
															gridColumn: '2 / -1',
															gridRow: '1',
														},
													}}
												>
													<input
														defaultValue={account.name}
														aria-label={`${account.name} name`}
														data-account-name={account.id}
														on={{
															blur: async (e) => {
																const name =
																	(e.currentTarget as HTMLInputElement).value ||
																	account.name
																const colorSelect = document.querySelector(
																	`select[data-account-color="${account.id}"]`,
																) as HTMLSelectElement
																const colorToken =
																	colorSelect?.value || account.colorToken
																if (
																	name === account.name &&
																	colorToken === account.colorToken
																) {
																	return
																}
																updateLocalAccount(account.id, {
																	name,
																	colorToken,
																})
																await updateAccount({
																	accountId: account.id,
																	name,
																	colorToken,
																})
																await refreshSettings()
															},
														}}
														css={{
															...inputCss,
															backgroundColor: 'transparent',
															border: '2px solid transparent',
															boxShadow: 'none',
															fontWeight: 'bold',
															color: textColors.text,
															padding: spacing.xs,
															'&:focus': {
																...inputCss['&:focus'],
																backgroundColor: colors.surface,
																color: colors.text,
															},
														}}
													/>
													<span
														css={{
															color: textColors.muted,
															fontSize: typography.fontSize.sm,
														}}
													>
														{formatCents(account.balanceCents)}
													</span>
												</div>
												<select
													aria-label={`${account.name} color`}
													data-account-color={account.id}
													on={{
														change: async (e) => {
															const colorToken = (
																e.currentTarget as HTMLSelectElement
															).value
															const nameInput = document.querySelector(
																`input[data-account-name="${account.id}"]`,
															) as HTMLInputElement
															const name = nameInput?.value || account.name
															updateLocalAccount(account.id, {
																name,
																colorToken,
															})
															await updateAccount({
																accountId: account.id,
																name,
																colorToken,
															})
															await refreshSettings()
														},
													}}
													css={{
														...inputCss,
														backgroundColor: colors.surface,
														color: colors.text,
														colorScheme: 'light dark',
														[mq.mobile]: {
															gridColumn: '2 / 4',
															gridRow: '2',
														},
													}}
												>
													{accountColorTokens.map((color) => (
														<option
															key={color}
															value={color}
															selected={account.colorToken === color}
														>
															{color}
														</option>
													))}
												</select>
												<button
													type="button"
													aria-label={`Archive ${account.name}`}
													on={{
														click: async () => {
															await archiveAccount(account.id)
															await refreshSettings()
														},
													}}
													css={{
														...archiveIconButtonCss,
														[mq.mobile]: {
															gridColumn: '4',
															gridRow: '2',
															justifySelf: 'end',
														},
													}}
												>
													<TrashIcon />
												</button>
											</div>
										)
									})}
								</div>
								<div
									css={{
										display: 'grid',
										gridTemplateColumns: '1fr auto auto',
										gap: spacing.sm,
										padding: spacing.md,
										border: `2px dashed ${colors.border}`,
										borderRadius: radius.lg,
										background: getAccountGradientBackground(
											getCreateAccountColor(kid.id),
										),
										[mq.mobile]: {
											gridTemplateColumns: '1fr',
										},
									}}
								>
									<input
										data-create-account-name={kid.id}
										placeholder="New account name"
										css={inputCss}
									/>
									<select
										data-create-account-color={kid.id}
										value={getCreateAccountColor(kid.id)}
										on={{
											change: (event) => {
												if (!(event.currentTarget instanceof HTMLSelectElement))
													return
												newAccountColorsByKidId[kid.id] =
													event.currentTarget.value
												handle.update()
											},
										}}
										css={inputCss}
									>
										{accountColorTokens.map((color) => (
											<option key={color} value={color}>
												{color}
											</option>
										))}
									</select>
									<button
										type="button"
										on={{
											click: async () => {
												const nameInput = document.querySelector(
													`input[data-create-account-name="${kid.id}"]`,
												)
												const colorSelect = document.querySelector(
													`select[data-create-account-color="${kid.id}"]`,
												)
												if (
													!(nameInput instanceof HTMLInputElement) ||
													!(colorSelect instanceof HTMLSelectElement)
												) {
													return
												}
												const accountName = nameInput.value.trim()
												if (!accountName) return
												await createAccount({
													kidId: kid.id,
													name: accountName,
													colorToken: getCreateAccountColor(kid.id),
												})
												nameInput.value = ''
												await refreshSettings()
											},
										}}
										css={buttonCss}
									>
										Add account
									</button>
								</div>
							</article>
						))}
					</section>

					<section
						css={{
							display: 'grid',
							gap: spacing.sm,
							padding: spacing.md,
							border: `3px solid ${colors.border}`,
							borderRadius: radius.xl,
							backgroundColor: colors.surface,
							boxShadow: shadows.md,
						}}
					>
						<h2 css={{ margin: 0, color: colors.text }}>Quick amounts</h2>

						<div css={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm }}>
							{state.quickAmounts.map((amount) => (
								<div
									key={amount}
									css={{
										display: 'flex',
										alignItems: 'center',
										gap: spacing.xs,
										padding: `${spacing.xs} ${spacing.sm}`,
										backgroundColor: colors.primarySoft,
										borderRadius: radius.full,
										border: `2px solid ${colors.primarySoftStrong}`,
										fontWeight: typography.fontWeight.bold,
									}}
								>
									<span>{formatCents(amount)}</span>
									<button
										type="button"
										on={{
											click: async () => {
												if (state.status !== 'ready') return
												const newAmounts = state.quickAmounts.filter(
													(a) => a !== amount,
												)
												await setQuickAmounts(newAmounts)
												await refreshSettings()
											},
										}}
										css={{
											background: 'none',
											border: 'none',
											cursor: 'pointer',
											color: colors.textMuted,
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											padding: 0,
											fontSize: typography.fontSize.lg,
											lineHeight: 1,
											'&:hover': { color: colors.error },
										}}
										aria-label={`Remove ${formatCents(amount)}`}
									>
										×
									</button>
								</div>
							))}
						</div>

						<form
							data-router-skip
							on={{
								submit: async (event) => {
									event.preventDefault()
									if (state.status !== 'ready') return
									if (!(event.currentTarget instanceof HTMLFormElement)) return
									const input =
										event.currentTarget.elements.namedItem('newAmount')
									if (!(input instanceof HTMLInputElement)) return

									const val = Number(input.value)
									if (Number.isFinite(val) && val > 0) {
										const cents = Math.round(val * 100)
										if (!state.quickAmounts.includes(cents)) {
											const newAmounts = [...state.quickAmounts, cents].sort(
												(a, b) => a - b,
											)
											await setQuickAmounts(newAmounts)
											await refreshSettings()
										}
										input.value = ''
									}
								},
							}}
							css={{
								display: 'grid',
								gridTemplateColumns: '1fr auto',
								gap: spacing.sm,
								marginTop: spacing.sm,
								[mq.mobile]: {
									gridTemplateColumns: '1fr',
								},
							}}
						>
							<input
								name="newAmount"
								type="number"
								step="0.01"
								min="0.01"
								placeholder="New amount (e.g. 5.00)"
								css={inputCss}
							/>
							<button type="submit" css={buttonCss}>
								Add
							</button>
						</form>
					</section>

					<section
						css={{
							display: 'grid',
							gap: spacing.md,
							padding: spacing.md,
							border: `3px solid ${colors.error}`,
							borderRadius: radius.xl,
							backgroundColor: 'color-mix(in srgb, #dc2626 5%, transparent)',
							boxShadow: shadows.md,
						}}
					>
						<h2 css={{ margin: 0, color: colors.error }}>Danger Zone</h2>

						<div css={{ display: 'grid', gap: spacing.sm }}>
							<h3
								css={{
									margin: 0,
									color: colors.text,
									fontSize: typography.fontSize.lg,
								}}
							>
								Archive management
							</h3>
							{state.archived.kids.length === 0 &&
							state.archived.accounts.length === 0 ? (
								<div
									css={{
										display: 'flex',
										flexDirection: 'column',
										alignItems: 'center',
										gap: spacing.sm,
										padding: spacing.xl,
										color: colors.textMuted,
									}}
								>
									<span css={{ fontSize: '2rem' }}>📭</span>
									<p css={{ margin: 0 }}>No archived records.</p>
								</div>
							) : null}
							{state.archived.kids.map((kid) => (
								<div key={kid.id} css={archivedRowCss}>
									<span>
										{kid.emoji} {kid.name}
									</span>
									<div css={archivedRowActionsCss}>
										<button
											type="button"
											on={{
												click: async () => {
													try {
														await unarchiveKid(kid.id)
														await refreshSettings()
													} catch (error) {
														notify(
															error instanceof Error
																? error.message
																: 'Could not unarchive kid.',
														)
													}
												},
											}}
											css={buttonCss}
										>
											Unarchive
										</button>
										<button
											type="button"
											on={{
												click: async () => {
													await deleteKid(kid.id)
													await refreshSettings()
												},
											}}
											css={dangerButtonCss}
										>
											Delete forever
										</button>
									</div>
								</div>
							))}
							{state.archived.accounts.map((account) => (
								<div key={account.id} css={archivedRowCss}>
									<span>
										{account.kidName} · {account.name}
									</span>
									<div css={archivedRowActionsCss}>
										<button
											type="button"
											on={{
												click: async () => {
													try {
														await unarchiveAccount(account.id)
														await refreshSettings()
													} catch (error) {
														notify(
															error instanceof Error
																? error.message
																: 'Could not unarchive account.',
														)
													}
												},
											}}
											css={buttonCss}
										>
											Unarchive
										</button>
										<button
											type="button"
											on={{
												click: async () => {
													await deleteAccount(account.id)
													await refreshSettings()
												},
											}}
											css={dangerButtonCss}
										>
											Delete forever
										</button>
									</div>
								</div>
							))}
						</div>

						<div
							css={{
								display: 'grid',
								gap: spacing.sm,
								paddingTop: spacing.md,
								borderTop: `1px solid color-mix(in srgb, #dc2626 20%, transparent)`,
							}}
						>
							<h3
								css={{
									margin: 0,
									color: colors.text,
									fontSize: typography.fontSize.lg,
								}}
							>
								Data export
							</h3>
							<a
								href="/ledger/export/json"
								css={{
									color: colors.error,
									fontWeight: typography.fontWeight.bold,
								}}
							>
								Download JSON backup
							</a>
						</div>
					</section>

					{editingKidTransactionModalCss ? (
						<div
							on={{
								click: (event) => {
									if (event.target === event.currentTarget) {
										closeTransactionModalCssEditor()
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
								pointerEvents: transactionModalCssClosing ? 'none' : 'auto',
								animation: transactionModalCssClosing
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
								aria-labelledby="kid-transaction-modal-css-title"
								on={{ keydown: handleTransactionModalCssKeydown }}
								css={{
									width: 'min(42rem, 100%)',
									maxHeight: '85dvh',
									overflow: 'auto',
									display: 'grid',
									gap: spacing.md,
									padding: spacing.lg,
									borderRadius: radius.xl,
									border: `3px solid ${colors.border}`,
									backgroundColor: colors.surface,
									boxShadow: shadows.lg,
									animation: transactionModalCssClosing
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
								<header
									css={{ display: 'flex', justifyContent: 'space-between' }}
								>
									<div css={{ display: 'grid', gap: spacing.xs }}>
										<h3
											id="kid-transaction-modal-css-title"
											css={{ margin: 0, color: colors.text }}
										>
											Customize {editingKidTransactionModalCss.kidName}&apos;s
											transaction modal
										</h3>
										<p css={{ margin: 0, color: colors.textMuted }}>
											Enter declarations or full CSS rules. When this kid&apos;s
											transaction modal is open on Home, the styles apply to the
											whole page.
										</p>
									</div>
									<button
										type="button"
										on={{ click: closeTransactionModalCssEditor }}
										css={buttonCss}
										disabled={transactionModalCssSaving}
									>
										Close
									</button>
								</header>
								<section css={{ display: 'grid', gap: spacing.sm }}>
									<strong css={{ color: colors.text }}>Live preview</strong>
									<p css={{ margin: 0, color: colors.textMuted }}>
										Updates in real time as you type.
									</p>
									{transactionModalCssDraft.trim() ? (
										<style data-kid-transaction-modal-preview-css>
											{buildTransactionModalCss(transactionModalCssDraft)}
										</style>
									) : null}
									<section
										data-kid-transaction-modal-preview
										css={{
											width: 'min(30rem, 100%)',
											display: 'grid',
											gap: spacing.md,
											padding: spacing.md,
											fontFamily: 'var(--font-family)',
											borderRadius: radius.xl,
											border: `3px solid ${colors.border}`,
											backgroundColor: colors.surface,
											boxShadow: shadows.lg,
										}}
									>
										<header
											css={{ display: 'flex', justifyContent: 'space-between' }}
										>
											<div>
												<h3 css={{ margin: 0, color: colors.text }}>
													{editingKidTransactionModalCss.kidEmoji}{' '}
													{editingKidTransactionModalCss.kidName}
												</h3>
												<p css={{ margin: 0, color: colors.textMuted }}>
													Spending · $12.50
												</p>
											</div>
											<span css={{ color: colors.textMuted }}>Close</span>
										</header>
										<label css={{ display: 'grid', gap: spacing.xs }}>
											<span css={{ color: colors.text }}>Amount</span>
											<input type="text" value="5.00" readOnly css={inputCss} />
										</label>
										<div
											css={{
												display: 'grid',
												gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
												gap: spacing.xs,
											}}
										>
											<button type="button" css={buttonCss}>
												$1.00
											</button>
											<button type="button" css={buttonCss}>
												$5.00
											</button>
											<button type="button" css={buttonCss}>
												$10.00
											</button>
										</div>
									</section>
								</section>
								<label css={{ display: 'grid', gap: spacing.xs }}>
									<span css={{ color: colors.text }}>
										Custom CSS declarations
									</span>
									<textarea
										id="kid-transaction-modal-css-input"
										value={transactionModalCssDraft}
										on={{
											input: (event) => {
												if (
													!(event.currentTarget instanceof HTMLTextAreaElement)
												)
													return
												transactionModalCssDraft = event.currentTarget.value
												transactionModalCssSaveError = null
												handle.update()
											},
										}}
										rows={6}
										css={{
											...inputCss,
											fontFamily:
												'ui-monospace, SFMono-Regular, Menlo, monospace',
											resize: 'vertical',
											minHeight: '8rem',
										}}
									/>
								</label>
								<section css={{ display: 'grid', gap: spacing.xs }}>
									<strong css={{ color: colors.text }}>
										Supported CSS variables
									</strong>
									<div
										css={{
											display: 'flex',
											flexWrap: 'wrap',
											gap: spacing.xs,
										}}
									>
										{transactionModalCssVariables.map((cssVariable) => (
											<code
												key={cssVariable}
												css={{
													padding: `${spacing.xs} ${spacing.sm}`,
													border: `1px solid ${colors.border}`,
													borderRadius: radius.full,
													backgroundColor: colors.primarySoftest,
												}}
											>
												{cssVariable}
											</code>
										))}
									</div>
								</section>
								<div css={{ display: 'grid', gap: spacing.xs }}>
									<strong css={{ color: colors.text }}>Font example</strong>
									<pre
										css={{
											margin: 0,
											padding: spacing.sm,
											borderRadius: radius.md,
											border: `2px solid ${colors.border}`,
											backgroundColor: colors.primarySoftest,
											color: colors.text,
											overflowX: 'auto',
										}}
									>
										{transactionModalCssFontExample}
									</pre>
								</div>
								<div css={{ display: 'grid', gap: spacing.xs }}>
									<strong css={{ color: colors.text }}>
										Google Fonts example
									</strong>
									<pre
										css={{
											margin: 0,
											padding: spacing.sm,
											borderRadius: radius.md,
											border: `2px solid ${colors.border}`,
											backgroundColor: colors.primarySoftest,
											color: colors.text,
											overflowX: 'auto',
										}}
									>
										{transactionModalCssGoogleFontExample}
									</pre>
								</div>
								{transactionModalCssSaveError ? (
									<p css={{ margin: 0, color: colors.error }}>
										{transactionModalCssSaveError}
									</p>
								) : null}
								<div
									css={{
										display: 'flex',
										justifyContent: 'flex-end',
										gap: spacing.sm,
										flexWrap: 'wrap',
									}}
								>
									<button
										type="button"
										on={{ click: closeTransactionModalCssEditor }}
										css={buttonCss}
										disabled={transactionModalCssSaving}
									>
										Cancel
									</button>
									<button
										type="button"
										on={{ click: () => void saveTransactionModalCss() }}
										css={buttonCss}
										disabled={transactionModalCssSaving}
									>
										{transactionModalCssSaving ? 'Saving...' : 'Save CSS'}
									</button>
								</div>
							</section>
						</div>
					) : null}

					{state.message ? (
						<p
							css={{ margin: 0, color: colors.textMuted, textAlign: 'center' }}
						>
							{state.message}
						</p>
					) : null}
				</>
			) : null}
		</section>
	)
}

export const Component = SettingsRoute

export function getMetadata() {
	return { title: 'Settings' }
}

const dangerButtonCss = {
	...buttonCss,
	backgroundColor: colors.error,
	boxShadow: `0 4px 0 0 #b91c1c`,
	'&:active': {
		transform: 'translateY(4px)',
		boxShadow: `0 0 0 0 #b91c1c`,
	},
}

const archiveIconButtonCss = {
	...dangerButtonCss,
	minHeight: 40,
	minWidth: 40,
	padding: 0,
	lineHeight: 1,
	display: 'inline-flex',
	alignItems: 'center',
	justifyContent: 'center',
}

const transactionModalIconButtonCss = {
	...buttonCss,
	minHeight: 40,
	minWidth: 40,
	padding: 0,
	lineHeight: 1,
	display: 'inline-flex',
	alignItems: 'center',
	justifyContent: 'center',
}

const archivedRowCss = {
	display: 'flex',
	justifyContent: 'space-between',
	alignItems: 'center',
	gap: spacing.md,
	padding: spacing.md,
	border: `2px solid ${colors.border}`,
	borderRadius: radius.lg,
	backgroundColor: colors.surface,
	boxShadow: shadows.sm,
	[mq.mobile]: {
		flexDirection: 'column',
		alignItems: 'stretch',
		textAlign: 'center',
	},
}

const archivedRowActionsCss = {
	display: 'flex',
	gap: spacing.xs,
	flexWrap: 'wrap',
	justifyContent: 'flex-end',
}

const reorderControlsCss = {
	display: 'inline-flex',
	flexDirection: 'column',
	gap: 0,
	alignItems: 'stretch',
	'& > button': {
		borderRadius: 0,
	},
	'& > button:first-of-type': {
		borderTopLeftRadius: radius.md,
		borderTopRightRadius: radius.md,
	},
	'& > button:last-of-type': {
		borderBottomLeftRadius: radius.md,
		borderBottomRightRadius: radius.md,
	},
}

const reorderButtonCss = {
	...buttonCss,
	minHeight: 40,
	minWidth: 40,
	padding: 0,
	lineHeight: 1,
	boxShadow: 'none',
	'&:active': {
		transform: 'none',
		boxShadow: 'none',
	},
	'&:disabled': {
		cursor: 'not-allowed',
		opacity: 0.55,
		transform: 'none',
		boxShadow: 'none',
	},
}
