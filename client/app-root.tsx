import { clientEntry, type EntryComponent, type Handle } from 'remix/ui'
import { App } from './app.tsx'
import { AppLoaderDataProvider } from './route-loader-data.tsx'
import { RouterLocationProvider } from './router-location.tsx'
import { type SessionInfo } from './session.ts'
import { type AppLoaderDataEnvelope } from '#shared/route-loader-data.ts'

export const APP_ROOT_ENTRY_ID = '/client-entry.js#AppRoot'

export type AppRootProps = {
	url: string
	session: SessionInfo | null
	loaderData?: AppLoaderDataEnvelope | null
	notFound?: boolean
}

export const AppRoot: EntryComponent<AppRootProps> = clientEntry(
	APP_ROOT_ENTRY_ID,
	function AppRoot(handle: Handle<AppRootProps>) {
		return () => (
			<AppLoaderDataProvider loaderData={handle.props.loaderData ?? null}>
				<RouterLocationProvider url={handle.props.url}>
					<App
						embeddedSession={handle.props.session}
						notFound={handle.props.notFound === true}
					/>
				</RouterLocationProvider>
			</AppLoaderDataProvider>
		)
	},
)
