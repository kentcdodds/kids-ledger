/** @jsxImportSource remix/ui */
/** @jsxRuntime automatic */
import { type Handle } from 'remix/ui'
import { AppRoot, type AppRootProps } from '#client/app-root.tsx'

const appTitle = 'Kids Ledger'
const defaultClientEntryHref = '/client-entry.js'
const defaultStylesheetHref = '/styles.css'

export type SsrDocumentProps = AppRootProps & {
	title?: string | null
	clientEntryHref?: string
	stylesheetHref?: string
}

function formatDocumentTitle(pageTitle: string | null = null) {
	if (!pageTitle) return appTitle
	return `${pageTitle} | ${appTitle}`
}

export function SsrDocument(handle: Handle<SsrDocumentProps>) {
	const clientEntryHref = handle.props.clientEntryHref ?? defaultClientEntryHref
	const stylesheetHref = handle.props.stylesheetHref ?? defaultStylesheetHref
	const documentTitle = formatDocumentTitle(handle.props.title ?? null)

	return () => (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<link rel="icon" href="/favicon.ico" sizes="any" />
				<link
					rel="icon"
					type="image/png"
					sizes="32x32"
					href="/favicon-32x32.png"
				/>
				<link
					rel="icon"
					type="image/png"
					sizes="16x16"
					href="/favicon-16x16.png"
				/>
				<link
					rel="apple-touch-icon"
					sizes="180x180"
					href="/apple-touch-icon.png"
				/>
				<link rel="manifest" href="/site.webmanifest" />
				<meta name="theme-color" content="#f47c00" />
				<title>{documentTitle}</title>
				<link rel="modulepreload" href={clientEntryHref} />
				<link rel="stylesheet" href={stylesheetHref} />
			</head>
			<body>
				<div id="root">
					<AppRoot
						url={handle.props.url}
						session={handle.props.session}
						notFound={handle.props.notFound}
					/>
				</div>
				<script type="module" src={clientEntryHref}></script>
			</body>
		</html>
	)
}
