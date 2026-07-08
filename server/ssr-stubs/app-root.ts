import { type EntryComponent } from 'remix/ui'
import { type AppLoaderDataEnvelope } from '#shared/route-loader-data.ts'

export type AppRootProps = {
	url: string
	session: { email: string } | null
	loaderData?: AppLoaderDataEnvelope | null
	notFound?: boolean
}

export const APP_ROOT_ENTRY_ID = '/client-entry.js#AppRoot'
export const AppRoot = null as unknown as EntryComponent<AppRootProps>
