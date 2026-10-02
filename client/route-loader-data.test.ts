/// <reference types="bun" />
import { expect, test } from 'bun:test'
import { type Handle } from 'remix/component'
import { type AppLoaderDataEnvelope } from '#shared/route-loader-data.ts'
import {
	AppLoaderDataProvider,
	tryConsumeRouteLoaderData,
} from './route-loader-data.tsx'

type QueueTask = Parameters<Handle['queueTask']>[0]

function createStubHandle(loaderData: AppLoaderDataEnvelope | null) {
	const queuedTasks: Array<QueueTask> = []
	const providerValue = { loaderData, consumedKeys: new Set<string>() }
	let updateCount = 0
	const handle = {
		context: {
			get(provider: unknown) {
				if (provider === AppLoaderDataProvider) return providerValue
				return undefined
			},
		},
		queueTask(task: QueueTask) {
			queuedTasks.push(task)
		},
		update() {
			updateCount++
			return Promise.resolve(new AbortController().signal)
		},
	} as unknown as Handle
	return {
		handle,
		queuedTasks,
		getUpdateCount: () => updateCount,
	}
}

const settingsPayload = {
	ok: true as const,
	settings: {
		kids: [],
		archived: { kids: [], accounts: [] },
		quickAmounts: [],
	},
}

test('consuming embedded route data schedules one corrective render', async () => {
	const { handle, queuedTasks, getUpdateCount } = createStubHandle({
		href: '/settings',
		data: { settings: settingsPayload },
	})

	const settings = tryConsumeRouteLoaderData(handle, 'settings', '/settings')
	expect(settings).toBe(settingsPayload)
	expect(queuedTasks).toHaveLength(1)
	await queuedTasks.shift()!(new AbortController().signal)
	expect(getUpdateCount()).toBe(1)

	const reconsumed = tryConsumeRouteLoaderData(handle, 'settings', '/settings')
	expect(reconsumed).toBeUndefined()
	expect(queuedTasks).toHaveLength(0)
	expect(getUpdateCount()).toBe(1)
})

test('embedded route data is ignored for a different href', () => {
	const { handle, queuedTasks } = createStubHandle({
		href: '/settings',
		data: { settings: settingsPayload },
	})

	expect(
		tryConsumeRouteLoaderData(handle, 'settings', '/history'),
	).toBeUndefined()
	expect(queuedTasks).toHaveLength(0)
})
