import { spawnSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

type WranglerEnvName = 'preview' | 'production'

type D1BindingReplacement = {
	binding: string
	databaseName: string
	databaseId: string
}

export type D1DatabaseListEntry = {
	uuid: string
	name: string
}

export type KvNamespaceListEntry = {
	id: string
	title: string
}

const appDatabaseName = 'kids-ledger'
const cloudflareAccountIdEnv = 'CLOUDFLARE_ACCOUNT_ID'

export function fail(message: string): never {
	console.error(message)
	process.exit(1)
}

function renderArg(value: string) {
	if (!value) return '""'
	if (/^[a-zA-Z0-9_./:-]+$/.test(value)) return value
	return JSON.stringify(value)
}

export function runWrangler(
	args: Array<string>,
	options?: {
		input?: string
		quiet?: boolean
		env?: Record<string, string | undefined>
	},
) {
	const bunBin = process.execPath
	const result = spawnSync(bunBin, ['x', 'wrangler', ...args], {
		encoding: 'utf8',
		stdio: 'pipe',
		input: options?.input,
		env: { ...process.env, ...options?.env },
	})

	const status = result.status ?? 1
	const stdout = result.stdout ?? ''
	const stderr = result.stderr ?? ''

	if (!options?.quiet) {
		const rendered = args.map(renderArg).join(' ')
		console.error(`wrangler: bun x wrangler ${rendered}`)
	}

	if (status !== 0) {
		if (options?.quiet) {
			const rendered = args.map(renderArg).join(' ')
			console.error(`wrangler (failed): bun x wrangler ${rendered}`)
		}
		const output = `${stdout}${stderr}`.trim()
		if (output) {
			console.error(output)
		}
	}

	return { status, stdout, stderr }
}

function parseAvailableAccountIds(output: string) {
	return Array.from(output.matchAll(/`([0-9a-f]{32})`/g), (match) => match[1])
		.filter((accountId): accountId is string => Boolean(accountId))
		.filter((accountId, index, accountIds) => {
			return accountIds.indexOf(accountId) === index
		})
}

function parseD1ListOutput(stdout: string): Array<D1DatabaseListEntry> {
	try {
		return JSON.parse(stdout) as Array<D1DatabaseListEntry>
	} catch {
		fail('Could not parse JSON output from wrangler d1 list --json.')
	}
}

function selectAccountFromD1ListFailure(output: string) {
	const accountIds = parseAvailableAccountIds(output)
	if (accountIds.length === 0) return null

	const candidates: Array<{
		accountId: string
		databases: Array<D1DatabaseListEntry>
	}> = []

	for (const accountId of accountIds) {
		const result = runWrangler(['d1', 'list', '--json'], {
			env: { [cloudflareAccountIdEnv]: accountId },
			quiet: true,
		})
		if (result.status !== 0) continue
		const databases = parseD1ListOutput(result.stdout)
		if (
			databases.some((database) => {
				return database.name === appDatabaseName
			})
		) {
			candidates.push({ accountId, databases })
		}
	}

	if (candidates.length !== 1) {
		fail(
			`Could not select a unique Cloudflare account from D1 databases. Set ${cloudflareAccountIdEnv} in CI.`,
		)
	}

	const [candidate] = candidates
	if (!candidate) {
		fail(
			`Could not select a Cloudflare account. Set ${cloudflareAccountIdEnv} in CI.`,
		)
	}
	process.env[cloudflareAccountIdEnv] = candidate.accountId
	console.error(
		`Selected Cloudflare account from existing D1 database "${appDatabaseName}".`,
	)
	return candidate.databases
}

export function truncateWithSuffix(
	base: string,
	suffix: string,
	maxLen: number,
) {
	if (base.length + suffix.length <= maxLen) {
		return `${base}${suffix}`
	}
	const cut = Math.max(1, maxLen - suffix.length)
	const trimmed = base.slice(0, cut).replace(/-+$/g, '')
	return `${trimmed}${suffix}`
}

export function listD1Databases(): Array<D1DatabaseListEntry> {
	const result = runWrangler(['d1', 'list', '--json'], { quiet: true })
	if (result.status !== 0) {
		const selected = selectAccountFromD1ListFailure(
			`${result.stdout}\n${result.stderr}`,
		)
		if (selected) return selected
		fail('Failed to list D1 databases (wrangler d1 list --json).')
	}
	return parseD1ListOutput(result.stdout)
}

export function listKvNamespaces(): Array<KvNamespaceListEntry> {
	const result = runWrangler(['kv', 'namespace', 'list'], { quiet: true })
	if (result.status !== 0) {
		fail('Failed to list KV namespaces (wrangler kv namespace list).')
	}
	try {
		return JSON.parse(result.stdout) as Array<KvNamespaceListEntry>
	} catch {
		fail('Could not parse JSON output from wrangler kv namespace list.')
	}
}

function stripJsonc(source: string) {
	let output = ''
	let inString = false
	let stringQuote = ''
	let isEscaped = false
	let inLineComment = false
	let inBlockComment = false

	for (let index = 0; index < source.length; index += 1) {
		const char = source[index] ?? ''
		const next = source[index + 1] ?? ''

		if (inLineComment) {
			if (char === '\n') {
				inLineComment = false
				output += char
			}
			continue
		}

		if (inBlockComment) {
			if (char === '*' && next === '/') {
				inBlockComment = false
				index += 1
			}
			continue
		}

		if (inString) {
			output += char
			if (isEscaped) {
				isEscaped = false
				continue
			}
			if (char === '\\') {
				isEscaped = true
				continue
			}
			if (char === stringQuote) {
				inString = false
				stringQuote = ''
			}
			continue
		}

		if (char === '"' || char === "'") {
			inString = true
			stringQuote = char
			output += char
			continue
		}

		if (char === '/' && next === '/') {
			inLineComment = true
			index += 1
			continue
		}

		if (char === '/' && next === '*') {
			inBlockComment = true
			index += 1
			continue
		}

		output += char
	}

	return output
}

function stripTrailingCommas(source: string) {
	let output = ''
	let inString = false
	let stringQuote = ''
	let isEscaped = false

	for (let index = 0; index < source.length; index += 1) {
		const char = source[index] ?? ''

		if (inString) {
			output += char
			if (isEscaped) {
				isEscaped = false
				continue
			}
			if (char === '\\') {
				isEscaped = true
				continue
			}
			if (char === stringQuote) {
				inString = false
				stringQuote = ''
			}
			continue
		}

		if (char === '"' || char === "'") {
			inString = true
			stringQuote = char
			output += char
			continue
		}

		if (char === ',') {
			let lookahead = index + 1
			while (lookahead < source.length) {
				const next = source[lookahead] ?? ''
				if (next === ' ' || next === '\t' || next === '\n' || next === '\r') {
					lookahead += 1
					continue
				}
				if (next === '}' || next === ']') {
					// Skip comma before a closing token, preserve whitespace.
					break
				}
				break
			}
			const nextNonWhitespace = source[lookahead] ?? ''
			if (nextNonWhitespace === '}' || nextNonWhitespace === ']') {
				continue
			}
		}

		output += char
	}

	return output
}

export function parseJsonc<T>(source: string): T {
	const withoutBom = source.replace(/^\uFEFF/, '')
	const noComments = stripJsonc(withoutBom)
	const json = stripTrailingCommas(noComments)
	return JSON.parse(json) as T
}

async function readWranglerEnvConfig({
	baseConfigPath,
	envName,
}: {
	baseConfigPath: string
	envName: WranglerEnvName
}) {
	const baseText = await readFile(baseConfigPath, 'utf8')
	const config = parseJsonc<Record<string, unknown>>(baseText)

	const env = config.env
	if (!env || typeof env !== 'object') {
		fail(`wrangler config "${baseConfigPath}" is missing "env".`)
	}

	const targetEnv = (env as Record<string, unknown>)[envName]
	if (!targetEnv || typeof targetEnv !== 'object') {
		fail(`wrangler config "${baseConfigPath}" is missing "env.${envName}".`)
	}

	return { config, targetEnv: targetEnv as Record<string, unknown> }
}

function replaceD1Bindings({
	baseConfigPath,
	envName,
	targetEnv,
	d1Bindings,
}: {
	baseConfigPath: string
	envName: WranglerEnvName
	targetEnv: Record<string, unknown>
	d1Bindings: Array<D1BindingReplacement>
}) {
	const d1Databases = (targetEnv as Record<string, unknown>).d1_databases
	if (!Array.isArray(d1Databases)) {
		fail(
			`wrangler config "${baseConfigPath}" is missing "env.${envName}.d1_databases".`,
		)
	}

	for (const replacement of d1Bindings) {
		const d1EntryIndex = d1Databases.findIndex((entry) => {
			if (!entry || typeof entry !== 'object') return false
			return (entry as Record<string, unknown>).binding === replacement.binding
		})
		if (d1EntryIndex < 0) {
			fail(
				`wrangler config "${baseConfigPath}" has no ${envName} D1 binding for "${replacement.binding}".`,
			)
		}

		const d1Entry = d1Databases[d1EntryIndex] as Record<string, unknown>
		d1Databases[d1EntryIndex] = {
			...d1Entry,
			database_name: replacement.databaseName,
			database_id: replacement.databaseId,
		}
	}
}

function replaceKvBinding({
	baseConfigPath,
	envName,
	targetEnv,
	binding,
	id,
}: {
	baseConfigPath: string
	envName: WranglerEnvName
	targetEnv: Record<string, unknown>
	binding: string
	id: string
}) {
	const kvNamespaces = targetEnv.kv_namespaces
	if (!Array.isArray(kvNamespaces)) {
		fail(
			`wrangler config "${baseConfigPath}" is missing "env.${envName}.kv_namespaces".`,
		)
	}

	const kvEntryIndex = kvNamespaces.findIndex((entry) => {
		if (!entry || typeof entry !== 'object') return false
		return (entry as Record<string, unknown>).binding === binding
	})
	if (kvEntryIndex < 0) {
		fail(
			`wrangler config "${baseConfigPath}" has no ${envName} KV binding for "${binding}".`,
		)
	}

	const kvEntry = kvNamespaces[kvEntryIndex] as Record<string, unknown>
	kvNamespaces[kvEntryIndex] = {
		...kvEntry,
		id,
		preview_id: id,
	}
}

async function writeWranglerConfig(
	config: Record<string, unknown>,
	outConfigPath: string,
) {
	const resolvedOut = path.resolve(outConfigPath)
	await writeFile(
		resolvedOut,
		`${JSON.stringify(config, null, '\t')}\n`,
		'utf8',
	)
	console.error(`Wrote generated Wrangler config: ${resolvedOut}`)
	return resolvedOut
}

export async function writeGeneratedWranglerConfig({
	baseConfigPath,
	outConfigPath,
	envName,
	d1DatabaseName,
	d1DatabaseId,
	oauthKvId,
}: {
	baseConfigPath: string
	outConfigPath: string
	envName: WranglerEnvName
	d1DatabaseName: string
	d1DatabaseId: string
	oauthKvId: string
}) {
	const { config, targetEnv } = await readWranglerEnvConfig({
		baseConfigPath,
		envName,
	})
	replaceD1Bindings({
		baseConfigPath,
		envName,
		targetEnv,
		d1Bindings: [
			{
				binding: 'APP_DB',
				databaseName: d1DatabaseName,
				databaseId: d1DatabaseId,
			},
		],
	})
	replaceKvBinding({
		baseConfigPath,
		envName,
		targetEnv,
		binding: 'OAUTH_KV',
		id: oauthKvId,
	})
	return writeWranglerConfig(config, outConfigPath)
}

export async function writeGeneratedWranglerD1Config({
	baseConfigPath,
	outConfigPath,
	envName,
	d1Bindings,
}: {
	baseConfigPath: string
	outConfigPath: string
	envName: WranglerEnvName
	d1Bindings: Array<D1BindingReplacement>
}) {
	const { config, targetEnv } = await readWranglerEnvConfig({
		baseConfigPath,
		envName,
	})
	replaceD1Bindings({ baseConfigPath, envName, targetEnv, d1Bindings })
	return writeWranglerConfig(config, outConfigPath)
}
