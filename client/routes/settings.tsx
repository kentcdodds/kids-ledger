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
	updateAccount,
	updateKid,
	type KidSummary,
} from '#client/ledger-api.ts'
import { formatCents } from '#client/money.ts'
import { buttonCss, inputCss } from '#client/styles/form-controls.ts'
import { colors, radius, spacing, typography } from '#client/styles/tokens.ts'

const accountColors = [
	'orchid',
	'ocean',
	'meadow',
	'flame',
	'sun',
	'night',
] as const

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
	let newKidName = ''
	let newKidEmoji = '🧒'
	let draggedKidId: number | null = null
	let draggedAccount: { kidId: number; accountId: number } | null = null

	async function refreshSettings() {
		state = { status: 'loading', message: '', kids: state.kids }
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
			state = {
				status: 'error',
				message:
					error instanceof Error ? error.message : 'Failed to load settings.',
				kids: [],
			}
		}
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

	async function runMutation(
		action: () => Promise<unknown>,
		fallbackMessage: string,
	) {
		try {
			await action()
			await refreshSettings()
		} catch (error) {
			notify(error instanceof Error ? error.message : fallbackMessage)
		}
	}

	async function handleCreateKid() {
		if (state.status !== 'ready') return
		if (!newKidName.trim()) {
			notify('Kid name is required.')
			return
		}
		await runMutation(async () => {
			await createKid({ name: newKidName, emoji: newKidEmoji })
			newKidName = ''
		}, 'Could not create kid.')
	}

	async function handleKidReorderDrop(targetKidId: number) {
		if (state.status !== 'ready' || draggedKidId === null) return
		if (targetKidId === draggedKidId) return
		const ids = state.kids.map((kid) => kid.id)
		const from = ids.indexOf(draggedKidId)
		const to = ids.indexOf(targetKidId)
		if (from < 0 || to < 0) return
		ids.splice(to, 0, ids.splice(from, 1)[0]!)
		await runMutation(async () => {
			await reorderKids(ids)
			draggedKidId = null
		}, 'Could not reorder kids.')
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
		accountIds.splice(to, 0, accountIds.splice(from, 1)[0]!)
		await runMutation(async () => {
			await reorderAccounts(kidId, accountIds)
			draggedAccount = null
		}, 'Could not reorder accounts.')
	}

	return () => (
		<section css={{ display: 'grid', gap: spacing.lg }}>
			<header css={{ display: 'grid', gap: spacing.xs }}>
				<h1 css={{ margin: 0, color: colors.text }}>Household Settings</h1>
				<p css={{ margin: 0, color: colors.textMuted }}>
					Manage kids and accounts. Drag rows to reorder.
				</p>
			</header>

			{state.status === 'loading' ? (
				<p css={{ color: colors.textMuted }}>Loading settings...</p>
			) : null}
			{state.status === 'error' ? (
				<p css={{ color: colors.error }}>{state.message}</p>
			) : null}

			{state.status === 'ready' ? (
				<>
					<section
						css={{
							display: 'grid',
							gap: spacing.sm,
							padding: spacing.md,
							border: `1px solid ${colors.border}`,
							borderRadius: radius.lg,
							backgroundColor: colors.surface,
						}}
					>
						<h2 css={{ margin: 0, color: colors.text }}>Add kid</h2>
						<div
							css={{
								display: 'grid',
								gridTemplateColumns: '5rem 1fr auto',
								gap: spacing.sm,
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
						{state.kids.map((kid) => (
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
									padding: spacing.md,
									border: `1px solid ${colors.border}`,
									borderRadius: radius.lg,
									backgroundColor: colors.surface,
								}}
							>
								<header
									css={{
										display: 'grid',
										gridTemplateColumns: '4rem 1fr auto auto',
										gap: spacing.sm,
										alignItems: 'center',
									}}
								>
									<input
										defaultValue={kid.emoji}
										aria-label={`${kid.name} emoji`}
										data-kid-emoji={kid.id}
										maxLength={2}
										css={inputCss}
									/>
									<input
										defaultValue={kid.name}
										aria-label={`${kid.name} name`}
										data-kid-name={kid.id}
										css={inputCss}
									/>
									<button
										type="button"
										on={{
											click: async () => {
												const nameInput = document.querySelector(
													`input[data-kid-name="${kid.id}"]`,
												)
												const emojiInput = document.querySelector(
													`input[data-kid-emoji="${kid.id}"]`,
												)
												if (
													!(nameInput instanceof HTMLInputElement) ||
													!(emojiInput instanceof HTMLInputElement)
												) {
													return
												}
												await runMutation(async () => {
													await updateKid({
														kidId: kid.id,
														name: nameInput.value,
														emoji: emojiInput.value || '🧒',
													})
												}, 'Could not update kid.')
											},
										}}
										css={buttonCss}
									>
										Save
									</button>
									<button
										type="button"
										on={{
											click: async () => {
												await runMutation(
													() => archiveKid(kid.id),
													'Could not archive kid.',
												)
											},
										}}
										css={dangerButtonCss}
									>
										Archive
									</button>
								</header>
								<p css={{ margin: 0, color: colors.textMuted }}>
									Total: {formatCents(kid.totalBalanceCents)}
								</p>
								<div css={{ display: 'grid', gap: spacing.xs }}>
									{kid.accounts.map((account) => (
										<div
											key={account.id}
											draggable
											on={{
												dragstart: (event) => {
													event.stopPropagation()
													draggedKidId = null
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
												gridTemplateColumns: '1fr auto auto auto',
												gap: spacing.xs,
												alignItems: 'center',
												padding: spacing.sm,
												borderRadius: radius.md,
												backgroundColor: colors.primarySoftest,
											}}
										>
											<div css={{ display: 'grid', gap: 2 }}>
												<strong>{account.name}</strong>
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
												defaultValue={account.colorToken}
												aria-label={`${account.name} color`}
												data-account-color={account.id}
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
														const colorSelect = document.querySelector(
															`select[data-account-color="${account.id}"]`,
														)
														if (!(colorSelect instanceof HTMLSelectElement))
															return
														await runMutation(async () => {
															await updateAccount({
																accountId: account.id,
																name: account.name,
																colorToken: colorSelect.value,
															})
														}, 'Could not update account.')
													},
												}}
												css={buttonCss}
											>
												Save
											</button>
											<button
												type="button"
												on={{
													click: async () => {
														await runMutation(
															() => archiveAccount(account.id),
															'Could not archive account.',
														)
													},
												}}
												css={dangerButtonCss}
											>
												Archive
											</button>
										</div>
									))}
								</div>
								<div
									css={{
										display: 'grid',
										gridTemplateColumns: '1fr auto auto',
										gap: spacing.sm,
									}}
								>
									<input
										data-create-account-name={kid.id}
										placeholder="New account name"
										css={inputCss}
									/>
									<select
										data-create-account-color={kid.id}
										defaultValue="orchid"
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
												await runMutation(async () => {
													await createAccount({
														kidId: kid.id,
														name: accountName,
														colorToken: colorSelect.value,
													})
													nameInput.value = ''
												}, 'Could not create account.')
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
							border: `1px solid ${colors.border}`,
							borderRadius: radius.lg,
							backgroundColor: colors.surface,
						}}
					>
						<h2 css={{ margin: 0, color: colors.text }}>Quick amounts</h2>
						<form
							data-router-skip
							on={{
								submit: async (event) => {
									event.preventDefault()
									if (!(event.currentTarget instanceof HTMLFormElement)) return
									const formData = new FormData(event.currentTarget)
									const raw = String(formData.get('quickAmounts') ?? '')
									const amounts = raw
										.split(',')
										.map((value) => Number(value.trim()))
										.filter((value) => Number.isFinite(value) && value > 0)
										.map((value) => Math.round(value * 100))
									await runMutation(
										() => setQuickAmounts(amounts),
										'Could not save quick amounts.',
									)
								},
							}}
							css={{ display: 'grid', gap: spacing.sm }}
						>
							<input
								name="quickAmounts"
								defaultValue={state.quickAmounts
									.map((amount) => (amount / 100).toFixed(2))
									.join(', ')}
								css={inputCss}
							/>
							<button type="submit" css={buttonCss}>
								Save quick amounts
							</button>
						</form>
					</section>

					<section
						css={{
							display: 'grid',
							gap: spacing.sm,
							padding: spacing.md,
							border: `1px solid ${colors.border}`,
							borderRadius: radius.lg,
							backgroundColor: colors.surface,
						}}
					>
						<h2 css={{ margin: 0, color: colors.text }}>Archive management</h2>
						{state.archived.kids.length === 0 &&
						state.archived.accounts.length === 0 ? (
							<p css={{ margin: 0, color: colors.textMuted }}>
								No archived records.
							</p>
						) : null}
						{state.archived.kids.map((kid) => (
							<div key={kid.id} css={archivedRowCss}>
								<span>
									{kid.emoji} {kid.name}
								</span>
								<button
									type="button"
									on={{
										click: async () => {
											await runMutation(
												() => deleteKid(kid.id),
												'Could not delete kid.',
											)
										},
									}}
									css={dangerButtonCss}
								>
									Delete forever
								</button>
							</div>
						))}
						{state.archived.accounts.map((account) => (
							<div key={account.id} css={archivedRowCss}>
								<span>
									{account.kidName} · {account.name}
								</span>
								<button
									type="button"
									on={{
										click: async () => {
											await runMutation(
												() => deleteAccount(account.id),
												'Could not delete account.',
											)
										},
									}}
									css={dangerButtonCss}
								>
									Delete forever
								</button>
							</div>
						))}
					</section>

					<section css={{ display: 'grid', gap: spacing.sm }}>
						<a href="/ledger/export/json" css={{ color: colors.primaryText }}>
							Download JSON backup
						</a>
						{state.message ? (
							<p css={{ margin: 0, color: colors.textMuted }}>
								{state.message}
							</p>
						) : null}
					</section>
				</>
			) : null}
		</section>
	)
}

const dangerButtonCss = {
	...buttonCss,
	backgroundColor: colors.error,
}

const archivedRowCss = {
	display: 'flex',
	justifyContent: 'space-between',
	alignItems: 'center',
	gap: spacing.md,
	padding: spacing.sm,
	border: `1px solid ${colors.border}`,
	borderRadius: radius.md,
}
