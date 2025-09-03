import { type RouteConfig, index, route } from '@react-router/dev/routes'

export default [
	index('routes/home.tsx'),
	route('/create-ledger', 'routes/create-ledger.tsx'),
	route('/ledger/:ledgerId', 'routes/ledger.tsx'),
] satisfies RouteConfig
