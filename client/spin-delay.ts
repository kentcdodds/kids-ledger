type SpinDelayState = 'IDLE' | 'DELAY' | 'DISPLAY' | 'EXPIRE'

type SpinDelayOptions = {
	delay?: number
	minDuration?: number
}

const defaultSpinDelayOptions = {
	delay: 500,
	minDuration: 200,
} satisfies Required<SpinDelayOptions>

export function createSpinDelay(
	onChange: () => void,
	options: SpinDelayOptions = {},
) {
	const settings = { ...defaultSpinDelayOptions, ...options }
	let state: SpinDelayState = 'IDLE'
	let loading = false
	let timeoutId: number | null = null

	function clearTimer() {
		if (timeoutId === null) return
		window.clearTimeout(timeoutId)
		timeoutId = null
	}

	function setState(nextState: SpinDelayState) {
		if (state === nextState) return
		state = nextState
		onChange()
	}

	function scheduleDelay() {
		clearTimer()
		setState('DELAY')
		timeoutId = window.setTimeout(() => {
			if (!loading) {
				setState('IDLE')
				return
			}

			setState('DISPLAY')
			timeoutId = window.setTimeout(() => {
				if (!loading) {
					setState('IDLE')
					return
				}
				setState('EXPIRE')
			}, settings.minDuration)
		}, settings.delay)
	}

	function setLoading(nextLoading: boolean) {
		if (loading === nextLoading) return
		loading = nextLoading

		if (loading) {
			if (state === 'IDLE') {
				scheduleDelay()
			}
			return
		}

		if (state !== 'DISPLAY') {
			clearTimer()
			setState('IDLE')
		}
	}

	function isShowing() {
		return state === 'DISPLAY' || state === 'EXPIRE'
	}

	function dispose() {
		clearTimer()
		state = 'IDLE'
		loading = false
	}

	return {
		setLoading,
		isShowing,
		dispose,
	}
}
