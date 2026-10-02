import { type Handle, type RemixNode } from 'remix/component'
import {
	type AppLoaderData,
	type AppLoaderDataEnvelope,
} from '#shared/route-loader-data.ts'

type AppLoaderDataContextValue = {
	loaderData: AppLoaderDataEnvelope | null
	consumedKeys: Set<string>
}

function normalizeRouterHref(href: string) {
	const url = new URL(href, 'https://kids-ledger.local')
	return `${url.pathname}${url.search}`
}

function getConsumedKey(key: keyof AppLoaderData, href: string) {
	return `${normalizeRouterHref(href)}:${String(key)}`
}

function hrefMatches(left: string, right: string) {
	return normalizeRouterHref(left) === normalizeRouterHref(right)
}

// Each document render embeds a fresh envelope, so a new envelope identity
// means a navigation happened and every route may consume its data again.
export function AppLoaderDataProvider(
	handle: Handle<
		{ loaderData?: AppLoaderDataEnvelope | null; children?: RemixNode },
		AppLoaderDataContextValue
	>,
) {
	let value: AppLoaderDataContextValue = {
		loaderData: handle.props.loaderData ?? null,
		consumedKeys: new Set(),
	}
	handle.context.set(value)

	return () => {
		const loaderData = handle.props.loaderData ?? null
		if (loaderData !== value.loaderData) {
			value = { loaderData, consumedKeys: new Set() }
			handle.context.set(value)
		}
		return handle.props.children
	}
}

function scheduleCorrectiveRender(handle: Handle) {
	handle.queueTask(() => {
		void handle.update()
	})
}

export function tryConsumeRouteLoaderData<K extends keyof AppLoaderData>(
	handle: Handle,
	key: K,
	currentHref: string,
): AppLoaderData[K] | undefined {
	const context = handle.context.get(AppLoaderDataProvider)
	const loaderData = context?.loaderData
	if (!context || !loaderData || !hrefMatches(loaderData.href, currentHref)) {
		return undefined
	}
	const consumedKey = getConsumedKey(key, currentHref)
	if (context.consumedKeys.has(consumedKey)) return undefined
	if (!(key in loaderData.data)) return undefined
	context.consumedKeys.add(consumedKey)
	scheduleCorrectiveRender(handle)
	return loaderData.data[key] as AppLoaderData[K]
}
