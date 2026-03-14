/// <reference types="bun" />
import { expect, test } from 'bun:test'

import { fallbackKidEmoji, normalizeKidEmoji } from './emoji-utils.ts'

test('normalizeKidEmoji preserves flag emoji graphemes', () => {
	expect(normalizeKidEmoji('🇺🇸')).toBe('🇺🇸')
})

test('normalizeKidEmoji preserves zwj emoji graphemes', () => {
	expect(normalizeKidEmoji('👨‍👩‍👧‍👦')).toBe('👨‍👩‍👧‍👦')
})

test('normalizeKidEmoji preserves emoji with modifiers', () => {
	expect(normalizeKidEmoji('👍🏽')).toBe('👍🏽')
})

test('normalizeKidEmoji trims whitespace and keeps the first grapheme', () => {
	expect(normalizeKidEmoji('  🇺🇸🇨🇦  ')).toBe('🇺🇸')
})

test('normalizeKidEmoji falls back when the input is blank', () => {
	expect(normalizeKidEmoji('')).toBe(fallbackKidEmoji)
})
