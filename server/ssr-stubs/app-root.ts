import { type EntryComponent } from 'remix/ui'

export type AppRootProps = {
	url: string
	session: { email: string } | null
	notFound?: boolean
}

export const APP_ROOT_ENTRY_ID = '/client-entry.js#AppRoot'
export const AppRoot = null as unknown as EntryComponent<AppRootProps>
