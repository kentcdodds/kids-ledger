import { type Handle, type RemixNode } from 'remix/ui'
import { type SessionInfo } from '#shared/route-loader-data.ts'

export type AppSessionValue = {
	session: SessionInfo | null
}

export function AppSessionProvider(
	handle: Handle<
		{ session: SessionInfo | null; children?: RemixNode },
		AppSessionValue
	>,
) {
	handle.context.set({ session: handle.props.session })

	return () => {
		handle.context.set({ session: handle.props.session })
		return handle.props.children
	}
}

export function readAppSession(handle: Pick<Handle, 'context'>) {
	return handle.context.get(AppSessionProvider)
}
