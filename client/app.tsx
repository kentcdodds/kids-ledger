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

	let currentPath =
		typeof window !== 'undefined' ? window.location.pathname : '/'

	handle.queueTask(() => {
		queueSessionRefresh()
		syncDocumentTitle()
	})
	listenToRouterNavigation(handle, () => {
		currentPath = window.location.pathname
		queueSessionRefresh()
		syncDocumentTitle()
	})

	function getNavLinkCss(href: string) {
		const isActive = currentPath === href
		return {
			padding: `${spacing.xs} ${spacing.md}`,
			borderRadius: '999px',
			backgroundColor: isActive ? colors.primarySoftest : colors.surface,
			color: colors.primaryText,
			fontWeight: typography.fontWeight.semibold,
			textDecoration: 'none',
			border: `2px solid ${isActive ? colors.primary : colors.border}`,
			boxShadow: `0 2px 0 0 ${isActive ? colors.primary : colors.border}`,
			transition: 'all 0.1s ease',
			'&:hover': {
				backgroundColor: colors.primarySoftest,
			},
			'&:active': {
				transform: 'translateY(2px)',
				boxShadow: `0 0 0 0 ${isActive ? colors.primary : colors.border}`,
			},
		}
	}

	const navLogoLinkCss = {
		display: 'inline-flex',
		alignItems: 'center',
		marginRight: spacing.sm,
	}

	let driftX = 0
	let driftY = 0
	let isCoarsePointer = false
	let showTiltEnableButton = false
	let isRequestingTiltPermission = false
	let requestTiltPermission: null | (() => void) = null

	function clamp(value: number, min: number, max: number) {
		return Math.min(max, Math.max(min, value))
	}

	// Keep dot drift and pointer influence on CSS vars to avoid rerenders.
	handle.queueTask(() => {
		if (typeof window === 'undefined') return

		let hasOrientationListener = false
		let fallbackMotionIntervalId: number | null = null
		let lastDriftUpdate: number | null = null
		const driftSpeedPixelsPerSecond = 36

		function updateDotCssVars(mouseDirX: number, mouseDirY: number) {
			const now = performance.now()
			const deltaSeconds =
				lastDriftUpdate === null
					? 0
					: Math.min((now - lastDriftUpdate) / 1000, 0.25)
			lastDriftUpdate = now
			const directionMagnitude = Math.hypot(mouseDirX, mouseDirY)
			const normalizedDirX =
				directionMagnitude > 0.001 ? mouseDirX / directionMagnitude : 0
			const normalizedDirY =
				directionMagnitude > 0.001 ? mouseDirY / directionMagnitude : 0
			const speedScale = clamp(directionMagnitude, 0, 1) ** 1.8
			const driftStep = driftSpeedPixelsPerSecond * speedScale * deltaSeconds

			driftX += driftStep * normalizedDirX
			driftY += driftStep * normalizedDirY

			document.body.style.setProperty('--drift-x', `${driftX}px`)
			document.body.style.setProperty('--drift-y', `${driftY}px`)
			document.body.style.setProperty('--mouse-shift-x', `${mouseDirX * 10}px`)
			document.body.style.setProperty('--mouse-shift-y', `${mouseDirY * 10}px`)
		}

		function startFallbackMotion() {
			if (fallbackMotionIntervalId !== null) return
			// Keep subtle ambient drift for coarse pointers when tilt isn't active.
			fallbackMotionIntervalId = window.setInterval(() => {
				const time = performance.now()
				updateDotCssVars(Math.sin(time / 2800) * 0.25, -1)
			}, 220)
		}

		function stopFallbackMotion() {
			if (fallbackMotionIntervalId === null) return
			window.clearInterval(fallbackMotionIntervalId)
			fallbackMotionIntervalId = null
		}

		const updatePointerTarget = (event: PointerEvent) => {
			// Normalize pointer position relative to viewport center (-1 to 1).
			const centerX = window.innerWidth / 2
			const centerY = window.innerHeight / 2
			const relativeX = (event.clientX - centerX) / centerX
			const relativeY = (event.clientY - centerY) / centerY
			updateDotCssVars(
				Math.max(-1, Math.min(1, relativeX)),
				Math.max(-1, Math.min(1, relativeY)),
			)
		}

		function updateOrientationTarget(event: DeviceOrientationEvent) {
			if (event.beta === null || event.gamma === null) return
			const nextX = clamp(event.gamma / 35, -1, 1)
			const nextY = clamp(event.beta / 35, -1, 1)
			updateDotCssVars(nextX, nextY)
		}

		function startOrientationMotion() {
			if (hasOrientationListener) return
			stopFallbackMotion()
			window.addEventListener(
				'deviceorientation',
				updateOrientationTarget,
				true,
			)
			hasOrientationListener = true
		}

		const clearPointerTarget = () => {
			document.body.style.setProperty('--mouse-shift-x', '0px')
			document.body.style.setProperty('--mouse-shift-y', '0px')
		}

		isCoarsePointer =
			window.matchMedia('(pointer: coarse)').matches ||
			navigator.maxTouchPoints > 0

		if (isCoarsePointer) {
			startFallbackMotion()
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

		return () => {
			stopFallbackMotion()
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
					minHeight: '100dvh',
					display: 'flex',
					flexDirection: 'column',
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
						alignItems: 'center',
						marginBottom: spacing.xl,
					}}
				>
					{isLoggedIn ? (
						<a href="/" css={navLogoLinkCss} aria-label="Home">
							<img
								src="/logo.png"
								alt="kids-ledger logo"
								css={{ width: '48px', height: 'auto', display: 'block' }}
							/>
						</a>
					) : null}
					{showAuthLinks ? (
						<>
							<a href={loginHref} css={getNavLinkCss('/login')}>
								Login
							</a>
							<a href={signupHref} css={getNavLinkCss('/signup')}>
								Signup
							</a>
						</>
					) : null}
					{isLoggedIn ? (
						<>
							<a href="/history" css={getNavLinkCss('/history')}>
								History
							</a>
							<a href="/settings" css={getNavLinkCss('/settings')}>
								Settings
							</a>
							<a href="/account" css={getNavLinkCss('/account')}>
								{sessionEmail}
							</a>
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
				<footer
					css={{
						marginTop: 'auto',
						paddingTop: spacing.md,
						paddingBottom: spacing.md,
						borderTop: `2px solid ${colors.border}`,
						display: 'flex',
						flexWrap: 'wrap',
						alignItems: 'center',
						gap: spacing.sm,
						color: colors.textMuted,
					}}
				>
					<span>Made with ❤️ by Dad</span>
					<span aria-hidden="true">•</span>
					<a
						href="/privacy-policy"
						css={{
							color: colors.primaryText,
							textDecoration: 'underline',
						}}
					>
						Privacy Policy
					</a>
					<span aria-hidden="true">•</span>
					<a
						href="/terms-of-service"
						css={{
							color: colors.primaryText,
							textDecoration: 'underline',
						}}
					>
						Terms of Service
					</a>
					<span aria-hidden="true">•</span>
					<a
						href="/about"
						css={{
							color: colors.primaryText,
							textDecoration: 'underline',
						}}
					>
						About
					</a>
				</footer>
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
