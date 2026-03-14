import { type Page } from '@playwright/test'
import { expect, test } from './playwright-utils.ts'

test.use({ viewport: { width: 1280, height: 360 } })

async function waitForRouteToSettle(
	page: Page,
	path: '/' | '/history' | '/settings',
) {
	if (path === '/') {
		await expect(
			page.getByRole('heading', { name: 'Family Ledger' }),
		).toBeVisible()
		await expect(
			page.getByRole('heading', { name: 'No kids yet' }),
		).toBeVisible()
		return
	}

	if (path === '/history') {
		await expect(
			page.getByRole('heading', { name: 'Transaction History' }),
		).toBeVisible()
		await expect(
			page.getByText('No transactions match the current filters.'),
		).toBeVisible()
		return
	}

	await expect(
		page.getByRole('heading', { name: 'Household Settings' }),
	).toBeVisible()
	await expect(page.getByRole('heading', { name: 'Add kid' })).toBeVisible()
}

async function getFooterGap(page: Page) {
	return page.evaluate(() => {
		const footer = document.querySelector('main footer')
		if (!(footer instanceof HTMLElement)) {
			throw new Error('Footer not found.')
		}

		let routeContent = footer.previousElementSibling
		if (
			routeContent instanceof HTMLDivElement &&
			routeContent.childElementCount === 1
		) {
			routeContent = routeContent.firstElementChild
		}
		if (!(routeContent instanceof HTMLElement)) {
			throw new Error('Route content not found.')
		}

		const footerTop = footer.getBoundingClientRect().top
		const contentBottom = routeContent.getBoundingClientRect().bottom
		return Math.round((footerTop - contentBottom) * 100) / 100
	})
}

test('home history and settings keep the same footer gap', async ({
	page,
	login,
}) => {
	await login()

	const paths = ['/', '/history', '/settings'] as const
	const gaps = new Map<(typeof paths)[number], number>()

	for (const path of paths) {
		await page.goto(path)
		await waitForRouteToSettle(page, path)
		gaps.set(path, await getFooterGap(page))
	}

	const homeGap = gaps.get('/')
	expect(homeGap).toBeDefined()
	expect(homeGap).toBeGreaterThan(0)

	for (const path of paths.slice(1)) {
		const gap = gaps.get(path)
		expect(gap).toBeDefined()
		expect(Math.abs(gap! - homeGap!)).toBeLessThanOrEqual(1)
	}
})
