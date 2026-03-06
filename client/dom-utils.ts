export function getFocusableElements(container: HTMLElement) {
	const selector =
		'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
	const candidates = Array.from(container.querySelectorAll(selector))
	return candidates.filter(
		(element): element is HTMLElement =>
			element instanceof HTMLElement && element.tabIndex >= 0,
	)
}

export function handleModalKeydown(event: KeyboardEvent, onClose: () => void) {
	if (event.key === 'Escape') {
		event.preventDefault()
		onClose()
		return
	}

	if (event.key !== 'Tab') return
	if (!(event.currentTarget instanceof HTMLElement)) return

	const focusableElements = getFocusableElements(event.currentTarget)
	if (focusableElements.length === 0) {
		event.preventDefault()
		return
	}

	const activeElement = document.activeElement
	const firstFocusableElement = focusableElements[0]
	const lastFocusableElement = focusableElements[focusableElements.length - 1]
	if (!firstFocusableElement || !lastFocusableElement) return
	const activeInModal = focusableElements.includes(activeElement as HTMLElement)

	if (event.shiftKey) {
		if (activeElement === firstFocusableElement || !activeInModal) {
			event.preventDefault()
			lastFocusableElement.focus()
		}
		return
	}

	if (activeElement === lastFocusableElement || !activeInModal) {
		event.preventDefault()
		firstFocusableElement.focus()
	}
}
