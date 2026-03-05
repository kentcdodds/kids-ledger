export function getFocusableElements(container: HTMLElement) {
	const selector =
		'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
	const candidates = Array.from(container.querySelectorAll(selector))
	return candidates.filter(
		(element): element is HTMLElement =>
			element instanceof HTMLElement && element.tabIndex >= 0,
	)
}
