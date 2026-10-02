import { css, on, type Handle } from 'remix/component'
import { buildAuthLink } from '#client/auth-links.ts'
import { getErrorMessage, parseJsonOrNull } from '#client/http.ts'
import { readRouterSearch } from '#client/router-location.tsx'
import { normalizeRedirectTarget } from '#shared/redirect-target.ts'
import {
	colors,
	radius,
	shadows,
	spacing,
	transitions,
	typography,
} from '#client/styles/tokens.ts'
import { inputCss, buttonCss } from '#client/styles/form-controls.ts'

type AuthMode = 'login' | 'signup'
type AuthStatus = 'idle' | 'submitting' | 'success' | 'error'

type LoginFormSetup = {
	initialMode?: AuthMode
}

const rememberMeCheckboxCss = css({
	appearance: 'none',
	WebkitAppearance: 'none',
	margin: 0,
	boxSizing: 'border-box',
	position: 'relative',
	display: 'inline-grid',
	placeItems: 'center',
	width: '16px',
	height: '16px',
	minWidth: '16px',
	minHeight: '16px',
	padding: 0,
	border: 0,
	borderRadius: '4px',
	background: 'light-dark(#FFFFFF, #1a1a1a)',
	boxShadow:
		'0 2px 2px -1px rgba(0, 0, 0, 0.05), 0 3px 4px -1.5px rgba(0, 0, 0, 0.05), 0 4px 8px -2px rgba(0, 0, 0, 0.05), 0 5px 16px -2.5px rgba(0, 0, 0, 0.05), 0 0 0 1px light-dark(rgba(0, 0, 0, 0.12), rgba(255, 255, 255, 0.2))',
	color: 'light-dark(#FFFFFF, #151515)',
	verticalAlign: 'middle',
	flex: 'none',
	cursor: 'pointer',
	'&::before': {
		content: '""',
		position: 'absolute',
		opacity: 0,
		pointerEvents: 'none',
	},
	'&:disabled, &[aria-disabled="true"]': {
		opacity: 0.55,
	},
	'&:checked': {
		background:
			'linear-gradient(180deg, rgba(0, 0, 0, 0) 24.52%, light-dark(rgba(0, 0, 0, 0.1), rgba(255, 255, 255, 0.14)) 100%), light-dark(#3573F6, #6eaaff)',
		backgroundBlendMode: 'overlay, normal',
		borderRadius: '5px',
		boxShadow:
			'0 1px 1px -0.5px rgba(9, 68, 190, 0.12), 0 2px 2px -1px rgba(9, 68, 190, 0.12), 0 4px 4px -2px rgba(9, 68, 190, 0.12), 0 8px 8px -4px rgba(9, 68, 190, 0.12), 0 2px 8px rgba(53, 115, 246, 0.4), inset 0 0 3px 1px rgba(0, 0, 0, 0.1)',
	},
	'&:checked::before': {
		opacity: 1,
		left: '50%',
		top: '50%',
		width: '12px',
		height: '12px',
		background: 'currentColor',
		mask: "url(\"data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2.75 5.76562L5.10156 8.25L9.23438 1.75' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\") center / contain no-repeat",
		WebkitMask:
			"url(\"data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2.75 5.76562L5.10156 8.25L9.23438 1.75' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\") center / contain no-repeat",
		transform: 'translate(-50%, calc(-50% + 1px))',
	},
	'&:active:not(:disabled):not([aria-disabled="true"])': {
		boxShadow:
			'0 1px 1px -0.5px rgba(0, 0, 0, 0.06), 0 0 0 1px light-dark(rgba(0, 0, 0, 0.14), rgba(255, 255, 255, 0.24)), inset 0 1px 2px rgba(0, 0, 0, 0.08)',
	},
	'&:checked:active:not(:disabled):not([aria-disabled="true"])': {
		boxShadow:
			'0 1px 1px -0.5px rgba(9, 68, 190, 0.1), 0 2px 2px -1px rgba(9, 68, 190, 0.1), 0 4px 4px -2px rgba(9, 68, 190, 0.1), 0 6px 8px -4px rgba(9, 68, 190, 0.1), 0 2px 6px rgba(53, 115, 246, 0.32), inset 0 1px 2px rgba(0, 0, 0, 0.3), inset 0 0 3px 1px rgba(0, 0, 0, 0.12)',
	},
	'&:focus-visible': {
		outline: 0,
		boxShadow:
			'0 2px 3px -1px rgba(0, 0, 0, 0.04), 0 3px 4px -1.5px rgba(0, 0, 0, 0.04), 0 4px 5px -2px rgba(0, 0, 0, 0.04), 0 0 0 1px light-dark(#3573F6, #6eaaff), 0 0 0 4px light-dark(rgba(53, 115, 246, 0.1), rgba(110, 170, 255, 0.18)), 0 6px 32px 4px light-dark(rgba(53, 115, 246, 0.08), rgba(110, 170, 255, 0.14)), inset 0 0 8px 1px light-dark(rgba(53, 115, 246, 0.05), rgba(110, 170, 255, 0.1))',
	},
})

function getSearchParams(handle: Handle) {
	return new URLSearchParams(readRouterSearch(handle))
}

function buildAuthPath(mode: AuthMode, redirectTo: string | null) {
	const path = mode === 'signup' ? '/signup' : '/login'
	return buildAuthLink(path, redirectTo)
}

// The server redirects authenticated visitors away from /login and /signup, so
// this route never needs to check the session itself.
export function LoginRoute(handle: Handle, setup: LoginFormSetup = {}) {
	const mode: AuthMode = setup.initialMode ?? 'login'
	let status: AuthStatus = 'idle'
	let message: string | null = null

	function getRedirectTo() {
		return normalizeRedirectTarget(getSearchParams(handle).get('redirectTo'))
	}

	function setState(nextStatus: AuthStatus, nextMessage: string | null = null) {
		status = nextStatus
		message = nextMessage
		handle.update()
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault()
		if (!(event.currentTarget instanceof HTMLFormElement)) return

		const formData = new FormData(event.currentTarget)
		const email = String(formData.get('email') ?? '').trim()
		const password = String(formData.get('password') ?? '')
		const rememberMe = formData.get('rememberMe') === 'on'

		if (!email || !password) {
			setState('error', 'Email and password are required.')
			return
		}

		setState('submitting')

		try {
			const response = await fetch('/auth', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ email, password, mode, rememberMe }),
			})
			const payload = await parseJsonOrNull<{ error?: string }>(response)

			if (!response.ok) {
				const errorMessage = getErrorMessage(payload, 'Unable to authenticate.')
				setState('error', errorMessage)
				return
			}

			if (typeof window !== 'undefined') {
				window.location.assign(getRedirectTo() ?? '/account')
			}
		} catch {
			setState('error', 'Network error. Please try again.')
		}
	}

	return () => {
		const redirectTo = getRedirectTo()
		const isSignup = mode === 'signup'
		const isSubmitting = status === 'submitting'
		const title = isSignup ? 'Create your account' : 'Welcome back'
		const description = isSignup
			? 'Sign up to start using kids-ledger.'
			: 'Log in to continue to kids-ledger.'
		const submitLabel = isSignup ? 'Create account' : 'Sign in'
		const toggleLabel = isSignup
			? 'Already have an account?'
			: 'Need an account?'
		const toggleAction = isSignup ? 'Sign in instead' : 'Sign up instead'

		return (
			<section
				mix={css({
					maxWidth: '28rem',
					margin: '0 auto',
					display: 'grid',
					gap: spacing.lg,
				})}
			>
				<header mix={css({ display: 'grid', gap: spacing.xs })}>
					<h2
						mix={css({
							fontSize: typography.fontSize.xl,
							fontWeight: typography.fontWeight.semibold,
							color: colors.text,
						})}
					>
						{title}
					</h2>
					<p mix={css({ color: colors.textMuted })}>{description}</p>
				</header>
				<form
					mix={[
						css({
							display: 'grid',
							gap: spacing.md,
							padding: spacing.lg,
							borderRadius: radius.xl,
							border: `3px solid ${colors.border}`,
							backgroundColor: colors.surface,
							boxShadow: shadows.md,
						}),
						on<HTMLElement, 'submit'>('submit', handleSubmit),
					]}
				>
					<label mix={css({ display: 'grid', gap: spacing.xs })}>
						<span
							mix={css({
								color: colors.text,
								fontWeight: typography.fontWeight.medium,
								fontSize: typography.fontSize.sm,
							})}
						>
							Email
						</span>
						<input
							type="email"
							name="email"
							required
							autoFocus
							autoComplete="email"
							placeholder="you@example.com"
							mix={css({
								...inputCss,
								fontSize: typography.fontSize.base,
								fontFamily: typography.fontFamily,
							})}
						/>
					</label>
					<label mix={css({ display: 'grid', gap: spacing.xs })}>
						<span
							mix={css({
								color: colors.text,
								fontWeight: typography.fontWeight.medium,
								fontSize: typography.fontSize.sm,
							})}
						>
							Password
						</span>
						<input
							type="password"
							name="password"
							required
							autoComplete={isSignup ? 'new-password' : 'current-password'}
							placeholder="At least 8 characters"
							mix={css({
								...inputCss,
								fontSize: typography.fontSize.base,
								fontFamily: typography.fontFamily,
							})}
						/>
					</label>
					{!isSignup ? (
						<label
							mix={css({
								display: 'flex',
								alignItems: 'center',
								gap: spacing.sm,
								color: colors.text,
								fontSize: typography.fontSize.sm,
								fontWeight: typography.fontWeight.medium,
								cursor: 'pointer',
							})}
						>
							<input
								type="checkbox"
								name="rememberMe"
								mix={rememberMeCheckboxCss}
							/>
							<span>Remember me for 2 months</span>
						</label>
					) : null}
					<button
						type="submit"
						disabled={isSubmitting}
						mix={css({
							...buttonCss,
							padding: `${spacing.sm} ${spacing.lg}`,
							borderRadius: radius.full,
							fontSize: typography.fontSize.base,
							cursor: isSubmitting ? 'not-allowed' : 'pointer',
							opacity: isSubmitting ? 0.7 : 1,
							transition: `all ${transitions.fast}`,
							'&:hover': isSubmitting
								? undefined
								: {
										backgroundColor: colors.primaryHover,
										filter: 'brightness(1.1)',
									},
							'&:active': isSubmitting
								? undefined
								: {
										transform: 'translateY(4px)',
										boxShadow: `0 0 0 0 ${colors.primaryActive}`,
									},
						})}
					>
						{isSubmitting ? 'Submitting...' : submitLabel}
					</button>
					{message ? (
						<p
							mix={css({
								color: status === 'error' ? colors.error : colors.text,
								fontSize: typography.fontSize.sm,
							})}
							aria-live="polite"
						>
							{message}
						</p>
					) : null}
				</form>
				<div mix={css({ display: 'grid', gap: spacing.sm })}>
					<a
						href={buildAuthPath(isSignup ? 'login' : 'signup', redirectTo)}
						mix={css({
							background: 'none',
							border: 'none',
							padding: 0,
							color: colors.primaryText,
							fontSize: typography.fontSize.sm,
							cursor: 'pointer',
							textAlign: 'left',
							textDecoration: 'none',
							'&:hover': {
								textDecoration: 'underline',
							},
						})}
					>
						{toggleLabel} {toggleAction}
					</a>
					{!isSignup ? (
						<a
							href="/reset-password"
							mix={css({
								background: 'none',
								border: 'none',
								padding: 0,
								color: colors.primaryText,
								fontSize: typography.fontSize.sm,
								cursor: 'pointer',
								textAlign: 'left',
								textDecoration: 'none',
								'&:hover': {
									textDecoration: 'underline',
								},
							})}
						>
							Forgot password?
						</a>
					) : null}
					<a
						href="/"
						mix={css({
							color: colors.textMuted,
							fontSize: typography.fontSize.sm,
							textDecoration: 'none',
							'&:hover': {
								textDecoration: 'underline',
							},
						})}
					>
						Back home
					</a>
				</div>
			</section>
		)
	}
}

export const Component = LoginRoute
