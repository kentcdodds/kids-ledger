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
import { formatCents } from '#client/money.ts'
import {
	colors,
	radius,
	shadows,
	spacing,
	typography,
	mq,
} from '#client/styles/tokens.ts'
import { inputCss, buttonCss } from '#client/styles/form-controls.ts'

const accountColors = [
	'orchid',
	'ocean',
	'meadow',
	'flame',
	'sun',
	'night',
] as const

const accountRowBackgrounds: Record<(typeof accountColors)[number], string> = {
	orchid: 'color-mix(in srgb, #9541ff 14%, var(--color-surface))',
	ocean: 'color-mix(in srgb, #326dff 14%, var(--color-surface))',
	meadow: 'color-mix(in srgb, #1aa867 14%, var(--color-surface))',
	flame: 'color-mix(in srgb, #ff6a3c 14%, var(--color-surface))',
	sun: 'color-mix(in srgb, #f7b500 14%, var(--color-surface))',
	night: 'color-mix(in srgb, #3f4b66 16%, var(--color-surface))',
}

function getAccountRowBackground(colorToken: string) {
	return (
		accountRowBackgrounds[colorToken as (typeof accountColors)[number]] ??
		accountRowBackgrounds.orchid
	)
}

function moveItem<T>(items: Array<T>, from: number, to: number) {
	const nextItems = [...items]
	nextItems.splice(to, 0, nextItems.splice(from, 1)[0]!)
	return nextItems
}

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
	let newKidName = ''
	let newKidEmoji = '🧒'
	let newAccountColorsByKidId: Record<number, string> = {}
	let draggedKidId: number | null = null
	let draggedAccount: { kidId: number; accountId: number } | null = null

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

	async function handleCreateKid() {
		if (state.status !== 'ready') return
		if (!newKidName.trim()) {
			notify('Kid name is required.')
			return
		}
		await createKid({ name: newKidName, emoji: newKidEmoji })
		newKidName = ''
		await refreshSettings()
	}

	async function handleKidReorderDrop(targetKidId: number) {
		if (state.status !== 'ready' || draggedKidId === null) return
		if (targetKidId === draggedKidId) return
		const ids = state.kids.map((kid) => kid.id)
		const from = ids.indexOf(draggedKidId)
		const to = ids.indexOf(targetKidId)
		if (from < 0 || to < 0) return
		await reorderKids(moveItem(ids, from, to))
		draggedKidId = null
		await refreshSettings()
	}

	async function handleKidMove(kidId: number, delta: -1 | 1) {
		if (state.status !== 'ready') return
		const ids = state.kids.map((kid) => kid.id)
		const from = ids.indexOf(kidId)
		if (from < 0) return
		const to = from + delta
		if (to < 0 || to >= ids.length) return
		await reorderKids(moveItem(ids, from, to))
		await refreshSettings()
	}

	async function handleAccountReorderDrop(
		kidId: number,
		targetAccountId: number,
	) {
		if (state.status !== 'ready' || !draggedAccount) return
		if (draggedAccount.kidId !== kidId) return
		const kid = state.kids.find((entry) => entry.id === kidId)
		if (!kid) return
		const accountIds = kid.accounts.map((account) => account.id)
		const from = accountIds.indexOf(draggedAccount.accountId)
		const to = accountIds.indexOf(targetAccountId)
		if (from < 0 || to < 0) return
		await reorderAccounts(kidId, moveItem(accountIds, from, to))
		draggedAccount = null
		await refreshSettings()
	}

	async function handleAccountMove(
		kidId: number,
		accountId: number,
		delta: -1 | 1,
	) {
		if (state.status !== 'ready') return
		const kid = state.kids.find((entry) => entry.id === kidId)
		if (!kid) return
		const accountIds = kid.accounts.map((account) => account.id)
		const from = accountIds.indexOf(accountId)
		if (from < 0) return
		const to = from + delta
		if (to < 0 || to >= accountIds.length) return
		await reorderAccounts(kidId, moveItem(accountIds, from, to))
		await refreshSettings()
	}

	return () => (
		<section css={{ display: 'grid', gap: spacing.lg }}>
			<header css={{ display: 'grid', gap: spacing.xs }}>
				<h1 css={{ margin: 0, color: colors.text }}>Household Settings</h1>
				<p css={{ margin: 0, color: colors.textMuted }}>
					Manage kids and accounts. Drag on desktop or use arrows on mobile.
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
								gridTemplateColumns: '5rem 1fr auto',
								gap: spacing.sm,
								[mq.mobile]: {
									gridTemplateColumns: '5rem 1fr',
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
								css={inputCss}
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
								css={inputCss}
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
								draggable
								on={{
									dragstart: () => {
										draggedKidId = kid.id
									},
									dragover: (event) => event.preventDefault(),
									drop: () => {
										void handleKidReorderDrop(kid.id)
									},
								}}
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
										gridTemplateColumns: 'auto 4rem 1fr',
										gap: spacing.sm,
										alignItems: 'center',
										[mq.mobile]: {
											gridTemplateColumns: '4rem 1fr',
										},
									}}
								>
									<div
										css={{
											cursor: 'grab',
											color: colors.textMuted,
											padding: spacing.xs,
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											fontSize: typography.fontSize.lg,
											'&:active': { cursor: 'grabbing' },
											[mq.mobile]: { display: 'none' },
										}}
										title="Drag to reorder on desktop"
									>
										⋮⋮
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
												await updateKid({
													kidId: kid.id,
													name: nameInput?.value || kid.name,
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
												await updateKid({
													kidId: kid.id,
													name,
													emoji: emojiInput?.value || kid.emoji,
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
									<div css={sortArchiveRowCss}>
										<div css={reorderControlsCss}>
											<button
												type="button"
												aria-label={`Move ${kid.name} up`}
												disabled={kidIndex === 0}
												on={{
													click: () => void handleKidMove(kid.id, -1),
												}}
												css={reorderButtonCss}
											>
												↑
											</button>
											<button
												type="button"
												aria-label={`Move ${kid.name} down`}
												disabled={kidIndex === state.kids.length - 1}
												on={{
													click: () => void handleKidMove(kid.id, 1),
												}}
												css={reorderButtonCss}
											>
												↓
											</button>
										</div>
										<button
											type="button"
											on={{
												click: async () => {
													await archiveKid(kid.id)
													await refreshSettings()
												},
											}}
											css={dangerButtonCss}
										>
											Archive
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
									{kid.accounts.map((account, index) => (
										<div
											key={account.id}
											draggable
											on={{
												dragstart: () => {
													draggedAccount = {
														kidId: kid.id,
														accountId: account.id,
													}
												},
												dragover: (event) => event.preventDefault(),
												drop: () => {
													void handleAccountReorderDrop(kid.id, account.id)
												},
											}}
											css={{
												display: 'grid',
												gridTemplateColumns: 'auto 1fr auto',
												gap: spacing.xs,
												alignItems: 'center',
												padding: spacing.md,
												backgroundColor: getAccountRowBackground(
													account.colorToken,
												),
												borderBottom:
													index < kid.accounts.length - 1
														? `1px solid ${colors.border}`
														: 'none',
												[mq.mobile]: {
													gridTemplateColumns: 'auto 1fr',
													'& > select': {
														gridColumn: '1 / -1',
													},
												},
											}}
										>
											<div
												css={{
													cursor: 'grab',
													color: colors.textMuted,
													padding: spacing.xs,
													display: 'flex',
													alignItems: 'center',
													justifyContent: 'center',
													fontSize: typography.fontSize.lg,
													'&:active': { cursor: 'grabbing' },
													[mq.mobile]: { display: 'none' },
												}}
												title="Drag to reorder on desktop"
											>
												⋮⋮
											</div>
											<div css={{ display: 'grid', gap: 2 }}>
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
														padding: spacing.xs,
														'&:focus': {
															...inputCss['&:focus'],
															backgroundColor: colors.surface,
														},
													}}
												/>
												<span
													css={{
														color: colors.textMuted,
														fontSize: typography.fontSize.sm,
													}}
												>
													{formatCents(account.balanceCents)}
												</span>
											</div>
											<select
												value={account.colorToken}
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
														updateLocalAccount(account.id, { name, colorToken })
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
												}}
											>
												{accountColors.map((color) => (
													<option key={color} value={color}>
														{color}
													</option>
												))}
											</select>
											<div css={sortArchiveRowCss}>
												<div css={reorderControlsCss}>
													<button
														type="button"
														aria-label={`Move ${account.name} up`}
														disabled={index === 0}
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
														aria-label={`Move ${account.name} down`}
														disabled={index === kid.accounts.length - 1}
														on={{
															click: () =>
																void handleAccountMove(kid.id, account.id, 1),
														}}
														css={reorderButtonCss}
													>
														↓
													</button>
												</div>
												<button
													type="button"
													on={{
														click: async () => {
															await archiveAccount(account.id)
															await refreshSettings()
														},
													}}
													css={dangerButtonCss}
												>
													Archive
												</button>
											</div>
										</div>
									))}
								</div>
								<div
									css={{
										display: 'grid',
										gridTemplateColumns: '1fr auto auto',
										gap: spacing.sm,
										padding: spacing.md,
										border: `2px dashed ${colors.border}`,
										borderRadius: radius.lg,
										backgroundColor: getAccountRowBackground(
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
										{accountColors.map((color) => (
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
	display: 'none',
	gap: spacing.xs,
	alignItems: 'center',
	[mq.mobile]: {
		display: 'inline-flex',
	},
}

const sortArchiveRowCss = {
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'flex-end',
	gap: spacing.sm,
	gridColumn: '1 / -1',
	[mq.mobile]: {
		justifyContent: 'space-between',
	},
}

const reorderButtonCss = {
	...buttonCss,
	minHeight: 40,
	minWidth: 40,
	padding: 0,
	lineHeight: 1,
	boxShadow: `0 2px 0 0 ${colors.primaryActive}`,
	'&:active': {
		transform: 'translateY(2px)',
		boxShadow: `0 0 0 0 ${colors.primaryActive}`,
	},
	'&:disabled': {
		cursor: 'not-allowed',
		opacity: 0.55,
		transform: 'none',
		boxShadow: `0 2px 0 0 ${colors.border}`,
	},
}
