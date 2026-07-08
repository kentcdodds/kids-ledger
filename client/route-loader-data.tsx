import { type Handle, type RemixNode } from 'remix/ui'
import {
	type AppLoaderData,
	type AppLoaderDataEnvelope,
	type AppLoaderDataPayload,
} from '#shared/route-loader-data.ts'

export type ClientRouteLoader = (input: {
	url: URL
	signal: AbortSignal
}) => Promise<AppLoaderDataPayload | null | undefined>

type AppLoaderDataContextValue = {
	loaderData: AppLoaderDataEnvelope | null
	consumedKeys: Set<string>
}

type PreloadedNavigationData = AppLoaderDataEnvelope & {
	consumedKeys: Set<string>
}

export const routeDataEvents = new EventTarget()

let preloadedNavigationData: PreloadedNavigationData | null = null

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

export function AppLoaderDataProvider(
	handle: Handle<
		{ loaderData?: AppLoaderDataEnvelope | null; children?: RemixNode },
		AppLoaderDataContextValue
	>,
) {
	handle.context.set({
		loaderData: handle.props.loaderData ?? null,
		consumedKeys: new Set(),
	})

	return () => handle.props.children
}

export function setPreloadedNavigationData(
	href: string,
	data: AppLoaderDataPayload,
) {
	preloadedNavigationData = {
		href,
		data,
		consumedKeys: new Set(),
	}
}

export function clearPreloadedNavigationData() {
	preloadedNavigationData = null
}

function tryConsumeEmbeddedLoaderData<K extends keyof AppLoaderData>(
	handle: Pick<Handle, 'context'>,
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
	return loaderData.data[key] as AppLoaderData[K]
}

function tryConsumePreloadedLoaderData<K extends keyof AppLoaderData>(
	key: K,
	currentHref: string,
): AppLoaderData[K] | undefined {
	const loaderData = preloadedNavigationData
	if (!loaderData || !hrefMatches(loaderData.href, currentHref))
		return undefined
	const consumedKey = getConsumedKey(key, currentHref)
	if (loaderData.consumedKeys.has(consumedKey)) return undefined
	if (!(key in loaderData.data)) return undefined
	loaderData.consumedKeys.add(consumedKey)
	return loaderData.data[key] as AppLoaderData[K]
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
	const embedded = tryConsumeEmbeddedLoaderData(handle, key, currentHref)
	const data =
		embedded !== undefined
			? embedded
			: tryConsumePreloadedLoaderData(key, currentHref)
	if (data !== undefined) {
		scheduleCorrectiveRender(handle)
	}
	return data
}

export function requestRouteDataRevalidation() {
	routeDataEvents.dispatchEvent(new Event('revalidate'))
}
