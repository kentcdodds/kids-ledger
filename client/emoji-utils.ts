export const fallbackKidEmoji = '🧒'

const graphemeSegmenter =
	typeof Intl !== 'undefined' && 'Segmenter' in Intl
		? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
		: null

function getFirstGrapheme(value: string) {
	const trimmedValue = value.trim()
	if (!trimmedValue) return null

	if (graphemeSegmenter !== null) {
		const firstGrapheme = graphemeSegmenter
			.segment(trimmedValue)
			.containing(0)?.segment
		if (firstGrapheme) return firstGrapheme
	}

	return null
}

export function normalizeKidEmoji(value: string, fallback = fallbackKidEmoji) {
	return getFirstGrapheme(value) ?? fallback
}
