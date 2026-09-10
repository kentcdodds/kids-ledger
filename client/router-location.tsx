import { type Handle, type RemixNode } from 'remix/ui'

export type RouterLocationValue = {
	url: string
}

const routerLocationBase = 'https://kids-ledger.local'

export function RouterLocationProvider(
	handle: Handle<{ url: string; children?: RemixNode }, RouterLocationValue>,
) {
	handle.context.set({ url: handle.props.url })

	return () => {
		handle.context.set({ url: handle.props.url })
		return handle.props.children
	}
}

export function readRouterUrl(handle: Pick<Handle, 'context'>) {
	return handle.context.get(RouterLocationProvider).url
}

export function readRouterPathname(handle: Pick<Handle, 'context'>) {
	return new URL(readRouterUrl(handle), routerLocationBase).pathname
}

export function readRouterSearch(handle: Pick<Handle, 'context'>) {
	return new URL(readRouterUrl(handle), routerLocationBase).search
}
