import { type Handle, type RemixNode } from 'remix/ui'
import { type SessionInfo, type SessionStatus } from './session.ts'

export type AppSessionValue = {
	session: SessionInfo | null
	status: SessionStatus
}

export function AppSessionProvider(
	handle: Handle<
		{
			session: SessionInfo | null
			status: SessionStatus
			children?: RemixNode
		},
		AppSessionValue
	>,
) {
	handle.context.set({
		session: handle.props.session,
		status: handle.props.status,
	})

	return () => handle.props.children
}

export function readAppSession(
	handle: Pick<Handle, 'context'>,
): AppSessionValue {
	return (
		handle.context.get(AppSessionProvider) ?? {
			session: null,
			status: 'idle',
		}
	)
}
