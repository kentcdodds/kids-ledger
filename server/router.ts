import { createRouter } from 'remix/fetch-router'
import { type AppEnv } from '#types/env-schema.ts'
import { account } from './handlers/account.ts'
import { createAuthHandler } from './handlers/auth.ts'
import { chat } from './handlers/chat.ts'
import { createHealthHandler } from './handlers/health.ts'
import { history } from './handlers/history.ts'
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
} from './handlers/ledger-api.ts'
import { home } from './handlers/home.ts'
import { login } from './handlers/login.ts'
import { logout } from './handlers/logout.ts'
import { oauthAuthorizePage } from './handlers/oauth-authorize-page.ts'
import { oauthCallbackPage } from './handlers/oauth-callback-page.ts'
import {
	createPasswordResetConfirmHandler,
	createPasswordResetRequestHandler,
} from './handlers/password-reset.ts'
import { resetPasswordPage } from './handlers/reset-password-page.ts'
import { session } from './handlers/session.ts'
import { settings } from './handlers/settings.ts'
import { signup } from './handlers/signup.ts'
import { Layout } from './layout.ts'
import { render } from './render.ts'
import { routes } from './routes.ts'

export function createAppRouter(appEnv: AppEnv) {
	const router = createRouter({
		middleware: [],
		async defaultHandler() {
			return render(Layout({ title: 'Not Found' }))
		},
	})

	router.map(routes.home, home)
	router.map(routes.about, home)
	router.map(routes.chat, chat)
	router.map(routes.health, createHealthHandler(appEnv))
	router.map(routes.login, login)
	router.map(routes.signup, signup)
	router.map(routes.resetPassword, resetPasswordPage)
	router.map(routes.oauthAuthorize, oauthAuthorizePage)
	router.map(routes.oauthCallback, oauthCallbackPage)
	router.map(routes.account, account)
	router.map(routes.history, history)
	router.map(routes.settings, settings)
	router.map(routes.privacyPolicy, home)
	router.map(routes.termsOfService, home)
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
	router.map(routes.apiQuickAmountsSet, createQuickAmountsSetHandler(appEnv))
	router.map(routes.apiExportJson, createExportJsonHandler(appEnv))

	return router
}
