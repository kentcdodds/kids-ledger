import { addEventListeners, css, type Handle } from 'remix/ui'
import { routerEvents } from './client-router.tsx'
import { colors } from './styles/tokens.ts'

// Spin-delay semantics (https://npm.im/spin-delay): the bar only appears if a
// navigation is still pending after `showDelayMs`, and once shown it stays
// visible for at least `minShowDurationMs` so fast completions never flash.
const showDelayMs = 150
const minShowDurationMs = 200
const completePauseMs = 80
const trickleIntervalMs = 200
const trickleIncrement = 4
const maxTrickleProgress = 90
const fadeDurationMs = 200

export function NavigationProgress(handle: Handle) {
	// Boolean, not a counter: navigations are latest-wins and a superseded
	// (aborted) navigation never dispatches its own `navigationend`, so the
	// winning navigation's end event must clear the pending state outright.
	let navigationPending = false
	let visible = false
	let progress = 0
	let opacity = 0
	let visibleSinceMs = 0
	let showTimeoutId: number | null = null
	let completeTimeoutId: number | null = null
	let fadeTimeoutId: number | null = null
	let trickleIntervalId: number | null = null

	function clearShowTimer() {
		if (showTimeoutId === null) return
		window.clearTimeout(showTimeoutId)
		showTimeoutId = null
	}

	function clearTrickleTimer() {
		if (trickleIntervalId === null) return
		window.clearInterval(trickleIntervalId)
		trickleIntervalId = null
	}

	function clearCompletionTimers() {
		if (completeTimeoutId !== null) {
			window.clearTimeout(completeTimeoutId)
			completeTimeoutId = null
		}
		if (fadeTimeoutId !== null) {
			window.clearTimeout(fadeTimeoutId)
			fadeTimeoutId = null
		}
	}

	function clearAllTimers() {
		clearShowTimer()
		clearTrickleTimer()
		clearCompletionTimers()
	}

	function startTrickle() {
		clearTrickleTimer()
		trickleIntervalId = window.setInterval(() => {
			if (!navigationPending || !visible) return
			progress = Math.min(progress + trickleIncrement, maxTrickleProgress)
			handle.update()
		}, trickleIntervalMs)
	}

	function showProgress() {
		showTimeoutId = null
		if (!navigationPending) return
		visible = true
		opacity = 1
		progress = progress > 0 && progress < 100 ? progress : 8
		visibleSinceMs = Date.now()
		startTrickle()
		handle.update()
	}

	function completeProgress() {
		progress = 100
		handle.update()
		completeTimeoutId = window.setTimeout(() => {
			completeTimeoutId = null
			opacity = 0
			handle.update()
			fadeTimeoutId = window.setTimeout(() => {
				fadeTimeoutId = null
				visible = false
				progress = 0
				opacity = 0
				handle.update()
			}, fadeDurationMs)
		}, completePauseMs)
	}

	function handleNavigationStart() {
		navigationPending = true
		clearCompletionTimers()
		if (visible) {
			opacity = 1
			if (progress >= 100) {
				progress = 8
			}
			startTrickle()
			handle.update()
			return
		}
		if (showTimeoutId === null) {
			showTimeoutId = window.setTimeout(showProgress, showDelayMs)
		}
	}

	function handleNavigationEnd() {
		if (!navigationPending) return
		navigationPending = false
		clearShowTimer()
		clearTrickleTimer()
		if (!visible) {
			progress = 0
			opacity = 0
			return
		}
		const remainingMs = Math.max(
			0,
			minShowDurationMs - (Date.now() - visibleSinceMs),
		)
		completeTimeoutId = window.setTimeout(completeProgress, remainingMs)
	}

	if (typeof window !== 'undefined') {
		addEventListeners(routerEvents, handle.signal, {
			navigationstart: handleNavigationStart,
			navigationend: handleNavigationEnd,
		})
		handle.signal.addEventListener('abort', clearAllTimers, { once: true })
	}

	return () =>
		visible ? (
			<div
				aria-hidden="true"
				mix={css({
					position: 'fixed',
					top: 0,
					left: 0,
					right: 0,
					height: 3,
					zIndex: 9999,
					pointerEvents: 'none',
				})}
			>
				<div
					mix={css({
						width: `${progress}%`,
						height: '100%',
						backgroundColor: colors.primary,
						opacity,
						transition: `width 200ms ease-out, opacity ${fadeDurationMs}ms ease-out`,
					})}
				/>
			</div>
		) : null
}
