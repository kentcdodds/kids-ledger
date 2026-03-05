import { type Handle } from 'remix/component'
import { clientRoutes } from './routes/index.tsx'
import { listenToRouterNavigation, Router } from './client-router.tsx'
import {
	fetchSessionInfo,
	type SessionInfo,
	type SessionStatus,
} from './session.ts'
import { buildAuthLink } from './auth-links.ts'
import { colors, spacing, typography } from './styles/tokens.ts'

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

	handle.queueTask(() => {
		queueSessionRefresh()
	})
	listenToRouterNavigation(handle, queueSessionRefresh)

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
	let targetMouseX = 0
	let targetMouseY = 0
	let currentMouseX = 0
	let currentMouseY = 0
	let lastTime = typeof performance !== 'undefined' ? performance.now() : 0

	// Set up continuous drift animation that works alongside mouse position
	handle.queueTask(() => {
		if (typeof window === 'undefined') return

		let animationFrameId: number

		function updateDrift(time: number) {
			const delta = time - lastTime
			lastTime = time

			// Move 2px per second (60px every 30s)
			const driftSpeed = 2 / 1000
			driftX = (driftX + delta * driftSpeed) % 60
			driftY = (driftY + delta * driftSpeed) % 60

			// Smoothly interpolate mouse position for fluid movement
			currentMouseX += (targetMouseX - currentMouseX) * 0.1
			currentMouseY += (targetMouseY - currentMouseY) * 0.1

			document.body.style.setProperty('--drift-x', `${driftX}px`)
			document.body.style.setProperty('--drift-y', `${driftY}px`)
			document.body.style.setProperty('--mouse-x', `${currentMouseX}px`)
			document.body.style.setProperty('--mouse-y', `${currentMouseY}px`)

			animationFrameId = requestAnimationFrame(updateDrift)
		}

		animationFrameId = requestAnimationFrame(updateDrift)

		// Clean up on unmount (though App rarely unmounts)
		return () => cancelAnimationFrame(animationFrameId)
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
				on={{
					mousemove: (event) => {
						if (typeof window === 'undefined') return
						// Calculate mouse position relative to center of screen (-1 to 1)
						const x = (event.clientX / window.innerWidth) * 2 - 1
						const y = (event.clientY / window.innerHeight) * 2 - 1

						// Update CSS variables for mouse offset (move opposite to mouse for parallax)
						document.body.style.setProperty('--mouse-x', `${-x * 15}px`)
						document.body.style.setProperty('--mouse-y', `${-y * 15}px`)
					},
					mouseleave: () => {
						if (typeof window === 'undefined') return
						document.body.style.setProperty('--mouse-x', '0px')
						document.body.style.setProperty('--mouse-y', '0px')
					},
				}}
				css={{
					maxWidth: '52rem',
					margin: '0 auto',
					padding: spacing['2xl'],
					fontFamily: typography.fontFamily,
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
							<a href="/" css={navLinkCss}>
								Ledger
							</a>
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
			</main>
		)
	}
}
