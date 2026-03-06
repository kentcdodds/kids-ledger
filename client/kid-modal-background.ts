function escapeXmlText(value: string) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;')
}

function buildKidModalBackgroundImage(emoji: string) {
	const safeEmoji = escapeXmlText(emoji.trim())
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><text x="50%" y="55%" text-anchor="middle" dominant-baseline="middle" font-size="22">${safeEmoji}</text></svg>`
	return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`
}

export function setKidModalBackground(emoji: string) {
	if (typeof document === 'undefined') return
	if (!emoji.trim()) {
		clearKidModalBackground()
		return
	}
	document.body.dataset.kidModalOpen = 'true'
	document.body.style.setProperty(
		'--kid-modal-background-image',
		buildKidModalBackgroundImage(emoji),
	)
}

export function clearKidModalBackground() {
	if (typeof document === 'undefined') return
	delete document.body.dataset.kidModalOpen
	document.body.style.removeProperty('--kid-modal-background-image')
}
