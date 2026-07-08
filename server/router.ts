import { createRouter } from 'remix/fetch-router'
import { type AppEnv } from '#types/env-schema.ts'
import { createSsrAuthPageHandler } from './handlers/auth-page.ts'
import { createAuthHandler } from './handlers/auth.ts'
import { createHealthHandler } from './handlers/health.ts'
import {
	createAccountArchiveHandler,
	createAccountCreateHandler,
	createAccountDeleteHandler,
	createAccountReorderHandler,
	createAccountUnarchiveHandler,
	createAccountUpdateHandler,
	createExportJsonHandler,
	createKidArchiveHandler,
	createKidCreateHandler,
	createKidDeleteHandler,
	createKidReorderHandler,
	createKidUnarchiveHandler,
	createKidUpdateHandler,
	createLedgerDashboardHandler,
	createLedgerHistoryHandler,
	createLedgerSettingsHandler,
	createQuickAmountsSetHandler,
	createTransactionCreateHandler,
	createTransferCreateHandler,
} from './handlers/ledger-api.ts'
import { logout } from './handlers/logout.ts'
import {
	createPasswordResetConfirmHandler,
	createPasswordResetRequestHandler,
} from './handlers/password-reset.ts'
import { session } from './handlers/session.ts'
import { createProtectedPageHandler } from './protected-page.ts'
import { routes } from './routes.ts'
import { renderAppPage } from './ssr-render.tsx'

export function createAppRouter(appEnv: AppEnv) {
	function createPageHandler(title: string | null = null) {
		return {
			middleware: [],
			async handler({ request }: { request: Request }) {
				return renderAppPage({ request, appEnv, title })
			},
		}
	}

	const resetPasswordPage = {
		middleware: [],
		async handler({ request, url }: { request: Request; url: URL }) {
			const title = url.searchParams.get('token')
				? 'Set New Password'
				: 'Reset Password'
			return renderAppPage({ request, appEnv, title })
		},
	}

	const oauthCallbackPage = {
		middleware: [],
		async handler({ request, url }: { request: Request; url: URL }) {
			const title =
				url.searchParams.get('error') ||
				url.searchParams.get('error_description')
					? 'Authorization Failed'
					: 'Authorization Complete'
			const status = title === 'Authorization Failed' ? 400 : 200
			return renderAppPage({ request, appEnv, title, status })
		},
	}

	const router = createRouter({
		middleware: [],
		async defaultHandler({ request }) {
			return renderAppPage({
				request,
				appEnv,
				title: 'Not Found',
				notFound: true,
				status: 404,
			})
		},
	})

	router.map(routes.home, createPageHandler())
	router.map(routes.about, createPageHandler('About'))
	router.map(routes.chat, createProtectedPageHandler(appEnv, 'Chat'))
	router.map(routes.health, createHealthHandler(appEnv))
	router.map(routes.login, createSsrAuthPageHandler(appEnv))
	router.map(routes.signup, createSsrAuthPageHandler(appEnv))
	router.map(routes.resetPassword, resetPasswordPage)
	router.map(routes.oauthAuthorize, createPageHandler('Authorize App'))
	router.map(routes.oauthCallback, oauthCallbackPage)
	router.map(routes.account, createProtectedPageHandler(appEnv, 'Account'))
	router.map(routes.history, createProtectedPageHandler(appEnv, 'History'))
	router.map(routes.settings, createProtectedPageHandler(appEnv, 'Settings'))
	router.map(routes.privacyPolicy, createPageHandler('Privacy Policy'))
	router.map(routes.termsOfService, createPageHandler('Terms of Service'))
	router.map(routes.auth, createAuthHandler(appEnv))
	router.map(routes.session, session)
	router.map(routes.logout, logout)
	router.map(
		routes.passwordResetRequest,
		createPasswordResetRequestHandler(appEnv),
	)
	router.map(
		routes.passwordResetConfirm,
		createPasswordResetConfirmHandler(appEnv),
	)
	router.map(routes.apiLedgerDashboard, createLedgerDashboardHandler(appEnv))
	router.map(routes.apiLedgerSettings, createLedgerSettingsHandler(appEnv))
	router.map(routes.apiLedgerHistory, createLedgerHistoryHandler(appEnv))
	router.map(routes.apiKidsCreate, createKidCreateHandler(appEnv))
	router.map(routes.apiKidsUpdate, createKidUpdateHandler(appEnv))
	router.map(routes.apiKidsReorder, createKidReorderHandler(appEnv))
	router.map(routes.apiKidsArchive, createKidArchiveHandler(appEnv))
	router.map(routes.apiKidsUnarchive, createKidUnarchiveHandler(appEnv))
	router.map(routes.apiKidsDelete, createKidDeleteHandler(appEnv))
	router.map(routes.apiAccountsCreate, createAccountCreateHandler(appEnv))
	router.map(routes.apiAccountsUpdate, createAccountUpdateHandler(appEnv))
	router.map(routes.apiAccountsReorder, createAccountReorderHandler(appEnv))
	router.map(routes.apiAccountsArchive, createAccountArchiveHandler(appEnv))
	router.map(routes.apiAccountsUnarchive, createAccountUnarchiveHandler(appEnv))
	router.map(routes.apiAccountsDelete, createAccountDeleteHandler(appEnv))
	router.map(
		routes.apiTransactionsCreate,
		createTransactionCreateHandler(appEnv),
	)
	router.map(routes.apiTransfersCreate, createTransferCreateHandler(appEnv))
	router.map(routes.apiQuickAmountsSet, createQuickAmountsSetHandler(appEnv))
	router.map(routes.apiExportJson, createExportJsonHandler(appEnv))

	return router
}
