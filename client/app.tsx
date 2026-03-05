import { type Handle } from 'remix/component'
import { clientRoutes, getClientDocumentTitle } from './routes/index.tsx'
import { listenToRouterNavigation, Router } from './client-router.tsx'
import {
	fetchSessionInfo,
	type SessionInfo,
	type SessionStatus,
} from './session.ts'
import { buildAuthLink } from './auth-links.ts'
import { colors, spacing, typography, mq } from './styles/tokens.ts'

export function App(handle: Handle) {
	let session: SessionInfo | null = null
	let sessionStatus: SessionStatus = 'idle'
	let sessionRefreshInFlight = false
	let sessionRefreshQueued = false

	function queueSessionRefresh() {
		sessionRefreshQueued = true
		if (sessionRefreshInFlight) return

		// Preserve current nav state during refreshes after first load.
		if (sessionStatus === 'idle') {
			sessionStatus = 'loading'
			handle.update()
		}

		sessionRefreshQueued = false
		sessionRefreshInFlight = true
		handle.queueTask(async (signal) => {
			const nextSession = await fetchSessionInfo(signal)
			sessionRefreshInFlight = false
			if (signal.aborted) return
			session = nextSession
			sessionStatus = 'ready'
			handle.update()
			if (sessionRefreshQueued) {
				queueSessionRefresh()
			}
		})
		if (sessionStatus !== 'loading') {
			handle.update()
		}
	}

	function syncDocumentTitle() {
		if (typeof window === 'undefined') return
		document.title = getClientDocumentTitle(new URL(window.location.href))
	}

	handle.queueTask(() => {
		queueSessionRefresh()
		syncDocumentTitle()
	})
	listenToRouterNavigation(handle, () => {
		queueSessionRefresh()
		syncDocumentTitle()
	})

	const navLinkCss = {
		padding: `${spacing.xs} ${spacing.md}`,
		borderRadius: '999px',
		backgroundColor: colors.surface,
		color: colors.primaryText,
		fontWeight: typography.fontWeight.semibold,
		textDecoration: 'none',
		border: `2px solid ${colors.border}`,
		boxShadow: `0 2px 0 0 ${colors.border}`,
		transition: 'all 0.1s ease',
		'&:hover': {
			backgroundColor: colors.primarySoftest,
		},
		'&:active': {
			transform: 'translateY(2px)',
			boxShadow: `0 0 0 0 ${colors.border}`,
		},
	}

	const logOutButtonCss = {
		padding: `${spacing.xs} ${spacing.md}`,
		borderRadius: '999px',
		backgroundColor: colors.surface,
		color: colors.text,
		fontWeight: typography.fontWeight.semibold,
		border: `2px solid ${colors.border}`,
		boxShadow: `0 2px 0 0 ${colors.border}`,
		cursor: 'pointer',
		transition: 'all 0.1s ease',
		'&:hover': {
			backgroundColor: colors.primarySoftest,
		},
		'&:active': {
			transform: 'translateY(2px)',
			boxShadow: `0 0 0 0 ${colors.border}`,
		},
	}

	let driftX = 0
	let driftY = 0
	let targetMouseDirX = 0
	let targetMouseDirY = 0
	let currentMouseDirX = 0
	let currentMouseDirY = 0
	let isCoarsePointer = false
	let showTiltEnableButton = false
	let isRequestingTiltPermission = false
	let requestTiltPermission: null | (() => void) = null
	let lastTime = typeof performance !== 'undefined' ? performance.now() : 0

	function wrapDriftOffset(value: number, tileSize: number) {
		return ((value % tileSize) + tileSize) % tileSize
	}

	function clamp(value: number, min: number, max: number) {
		return Math.min(max, Math.max(min, value))
	}

	// Keep dot drift and pointer influence on CSS vars to avoid rerenders.
	handle.queueTask(() => {
		if (typeof window === 'undefined') return

		let animationFrameId: number
		let hasOrientationListener = false

		function updateDrift(time: number) {
			const delta = time - lastTime
			lastTime = time

			if (isCoarsePointer && !hasOrientationListener) {
				// Fallback for mobile when orientation is unavailable/denied.
				targetMouseDirX = Math.sin(time / 2800) * 0.25
				targetMouseDirY = -1
			}

			// Move in pointer direction (relative to viewport center).
			const driftSpeed = 10 / 1000
			const directionMagnitude = Math.hypot(currentMouseDirX, currentMouseDirY)
			const normalizedDirX =
				directionMagnitude > 0.001 ? currentMouseDirX / directionMagnitude : 0
			const normalizedDirY =
				directionMagnitude > 0.001 ? currentMouseDirY / directionMagnitude : 0
			driftX = wrapDriftOffset(driftX + delta * driftSpeed * normalizedDirX, 60)
			driftY = wrapDriftOffset(driftY + delta * driftSpeed * normalizedDirY, 60)

			// Smooth interpolation keeps movement subtle and fluid.
			currentMouseDirX += (targetMouseDirX - currentMouseDirX) * 0.08
			currentMouseDirY += (targetMouseDirY - currentMouseDirY) * 0.08

			document.body.style.setProperty('--drift-x', `${driftX}px`)
			document.body.style.setProperty('--drift-y', `${driftY}px`)
			document.body.style.setProperty('--mouse-dir-x', `${currentMouseDirX}`)
			document.body.style.setProperty('--mouse-dir-y', `${currentMouseDirY}`)

			animationFrameId = requestAnimationFrame(updateDrift)
		}

		const updatePointerTarget = (event: PointerEvent) => {
			// Normalize pointer position relative to viewport center (-1 to 1).
			const centerX = window.innerWidth / 2
			const centerY = window.innerHeight / 2
			const relativeX = (event.clientX - centerX) / centerX
			const relativeY = (event.clientY - centerY) / centerY
			targetMouseDirX = Math.max(-1, Math.min(1, relativeX))
			targetMouseDirY = Math.max(-1, Math.min(1, relativeY))
		}

		function updateOrientationTarget(event: DeviceOrientationEvent) {
			if (event.beta === null || event.gamma === null) return
			const nextX = clamp(event.gamma / 35, -1, 1)
			const nextY = clamp(event.beta / 35, -1, 1)
			targetMouseDirX = nextX
			targetMouseDirY = nextY
		}

		function startOrientationMotion() {
			if (hasOrientationListener) return
			window.addEventListener(
				'deviceorientation',
				updateOrientationTarget,
				true,
			)
			hasOrientationListener = true
		}

		const clearPointerTarget = () => {
			targetMouseDirX = 0
			targetMouseDirY = 0
		}

		isCoarsePointer =
			window.matchMedia('(pointer: coarse)').matches ||
			navigator.maxTouchPoints > 0

		if (isCoarsePointer) {
			const OrientationEventWithPermission =
				DeviceOrientationEvent as typeof DeviceOrientationEvent & {
					requestPermission?: () => Promise<'granted' | 'denied'>
				}
			if (
				typeof OrientationEventWithPermission.requestPermission === 'function'
			) {
				showTiltEnableButton = true
				requestTiltPermission = () => {
					if (isRequestingTiltPermission) return
					isRequestingTiltPermission = true
					handle.update()
					void OrientationEventWithPermission?.requestPermission?.()
						.then((permissionState) => {
							if (permissionState === 'granted') {
								startOrientationMotion()
							}
							showTiltEnableButton = false
							isRequestingTiltPermission = false
							handle.update()
						})
						.catch(() => {
							showTiltEnableButton = false
							isRequestingTiltPermission = false
							handle.update()
						})
				}
				handle.update()
			} else {
				startOrientationMotion()
			}
		} else {
			window.addEventListener('pointermove', updatePointerTarget)
			window.addEventListener('pointerleave', clearPointerTarget)
			window.addEventListener('blur', clearPointerTarget)
		}

		animationFrameId = requestAnimationFrame(updateDrift)

		return () => {
			cancelAnimationFrame(animationFrameId)
			if (hasOrientationListener) {
				window.removeEventListener(
					'deviceorientation',
					updateOrientationTarget,
					true,
				)
			}
			window.removeEventListener('pointermove', updatePointerTarget)
			window.removeEventListener('pointerleave', clearPointerTarget)
			window.removeEventListener('blur', clearPointerTarget)
		}
	})

	return () => {
		const sessionEmail = session?.email ?? ''
		const isSessionReady = sessionStatus === 'ready'
		const isLoggedIn = isSessionReady && Boolean(sessionEmail)
		const showAuthLinks = isSessionReady && !isLoggedIn
		const oauthRedirectTo =
			typeof window !== 'undefined' &&
			window.location.pathname === '/oauth/authorize'
				? `${window.location.pathname}${window.location.search}`
				: null
		const loginHref = buildAuthLink('/login', oauthRedirectTo)
		const signupHref = buildAuthLink('/signup', oauthRedirectTo)

		return (
			<main
				css={{
					maxWidth: '52rem',
					margin: '0 auto',
					padding: spacing.md,
					fontFamily: typography.fontFamily,
					[mq.mobile]: {
						padding: spacing.sm,
					},
				}}
			>
				<nav
					css={{
						display: 'flex',
						gap: spacing.md,
						flexWrap: 'wrap',
						marginBottom: spacing.xl,
					}}
				>
					<a href="/" css={navLinkCss}>
						Home
					</a>
					{showAuthLinks ? (
						<>
							<a href={loginHref} css={navLinkCss}>
								Login
							</a>
							<a href={signupHref} css={navLinkCss}>
								Signup
							</a>
						</>
					) : null}
					{isLoggedIn ? (
						<>
							<a href="/history" css={navLinkCss}>
								History
							</a>
							<a href="/settings" css={navLinkCss}>
								Settings
							</a>
							<a href="/account" css={navLinkCss}>
								{sessionEmail}
							</a>
							<form method="post" action="/logout" css={{ margin: 0 }}>
								<button type="submit" css={logOutButtonCss}>
									Log out
								</button>
							</form>
						</>
					) : null}
				</nav>
				<Router
					setup={{
						routes: clientRoutes,
						fallback: (
							<section>
								<h2
									css={{
										fontSize: typography.fontSize.lg,
										fontWeight: typography.fontWeight.semibold,
										marginBottom: spacing.sm,
										color: colors.text,
									}}
								>
									Not Found
								</h2>
								<p css={{ color: colors.textMuted }}>
									That route does not exist.
								</p>
							</section>
						),
					}}
				/>
				{showTiltEnableButton ? (
					<button
						type="button"
						on={{
							click: () => {
								requestTiltPermission?.()
							},
						}}
						css={{
							position: 'fixed',
							right: spacing.md,
							bottom: spacing.md,
							zIndex: 1000,
							padding: `${spacing.xs} ${spacing.md}`,
							borderRadius: '999px',
							border: `2px solid ${colors.border}`,
							backgroundColor: colors.surface,
							color: colors.primaryText,
							fontWeight: typography.fontWeight.semibold,
							boxShadow: `0 2px 0 0 ${colors.border}`,
							cursor: 'pointer',
						}}
					>
						{isRequestingTiltPermission
							? 'Enabling tilt...'
							: 'Enable tilt motion'}
					</button>
				) : null}
			</main>
		)
	}
}
