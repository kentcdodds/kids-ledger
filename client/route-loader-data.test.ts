/// <reference types="bun" />
import { expect, test } from 'bun:test'
import { type Handle } from 'remix/ui'
import {
	AppLoaderDataProvider,
	clearPreloadedNavigationData,
	setPreloadedNavigationData,
	tryConsumeRouteLoaderData,
} from './route-loader-data.tsx'

type QueueTask = Parameters<Handle['queueTask']>[0]

function createStubHandle() {
	const queuedTasks: Array<QueueTask> = []
	let updateCount = 0
	const handle = {
		context: {
			get(provider: unknown) {
				if (provider === AppLoaderDataProvider) {
					return { loaderData: null, consumedKeys: new Set() }
				}
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

test('consuming preloaded route data schedules one corrective render', async () => {
	clearPreloadedNavigationData()
	setPreloadedNavigationData('/account', {
		accountSession: { email: 'parent@example.com' },
	})
	const { handle, queuedTasks, getUpdateCount } = createStubHandle()

	const session = tryConsumeRouteLoaderData(
		handle,
		'accountSession',
		'/account',
	)
	expect(session?.email).toBe('parent@example.com')
	expect(queuedTasks).toHaveLength(1)
	await queuedTasks.shift()!(new AbortController().signal)
	expect(getUpdateCount()).toBe(1)

	const reconsumed = tryConsumeRouteLoaderData(
		handle,
		'accountSession',
		'/account',
	)
	expect(reconsumed).toBeUndefined()
	expect(queuedTasks).toHaveLength(0)
	expect(getUpdateCount()).toBe(1)

	clearPreloadedNavigationData()
})
