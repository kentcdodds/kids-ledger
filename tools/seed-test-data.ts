import { fail, runWrangler } from './ci/resource-utils.ts'
import { createPasswordHash } from '#shared/password-hash.ts'

type CliOptions = {
	email: string
	username: string
	password: string
	local: boolean
	remote: boolean
	configPath: string
	envName: string
	persistTo?: string
}

const defaultTestEmail = 'kody@kcd.dev'
const defaultTestPassword = 'kodylovesyou'

function parseArgs(argv: Array<string>): CliOptions {
	let usernameProvided = false
	const options: CliOptions = {
		email: defaultTestEmail,
		username: '',
		password: defaultTestPassword,
		local: false,
		remote: false,
		configPath: 'wrangler.jsonc',
		envName: process.env.CLOUDFLARE_ENV ?? 'production',
		persistTo: undefined,
	}
	let hasCustomUsername = false

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index]
		if (!arg) continue

		switch (arg) {
			case '--email': {
				options.email = argv[index + 1] ?? ''
				index += 1
				break
			}
			case '--username': {
				usernameProvided = true
				options.username = argv[index + 1] ?? ''
				hasCustomUsername = true
				index += 1
				break
			}
			case '--password': {
				options.password = argv[index + 1] ?? ''
				index += 1
				break
			}
			case '--local': {
				options.local = true
				break
			}
			case '--remote': {
				options.remote = true
				break
			}
			case '--config': {
				options.configPath = argv[index + 1] ?? ''
				index += 1
				break
			}
			case '--env': {
				options.envName = argv[index + 1] ?? ''
				index += 1
				break
			}
			case '--persist-to': {
				options.persistTo = argv[index + 1] ?? ''
				index += 1
				break
			}
			default: {
				if (arg.startsWith('-')) {
					fail(
						[
							`Unknown flag: ${arg}`,
							'Usage: bun tools/seed-test-data.ts [--local|--remote] [--config <path>] [--env <name>] [--persist-to <path>] [--email <email>] [--username <username>] [--password <password>]',
						].join('\n'),
					)
				}
			}
		}
	}

	if (options.local && options.remote) {
		fail('Choose only one target mode: --local or --remote.')
	}
	if (!options.local && !options.remote) {
		options.local = true
	}
	if (!hasCustomUsername) {
		options.username = options.email.trim().toLowerCase()
	}
	if (!options.email) {
		fail('Missing required --email <email> value.')
	}
	if (!usernameProvided) {
		options.username = options.email
	}
	if (!options.username) {
		fail('Missing required --username <username> value.')
	}
	if (!options.password) {
		fail('Missing required --password <password> value.')
	}
	if (!options.configPath) {
		fail('Missing required --config <path> value.')
	}
	if (!options.envName) {
		fail('Missing required --env <name> value.')
	}
	if (options.remote && options.persistTo) {
		fail('--persist-to is only valid with --local.')
	}
	if (options.remote && !process.env.CLOUDFLARE_API_TOKEN) {
		fail(
			'Missing CLOUDFLARE_API_TOKEN (required for remote D1 seeding operations).',
		)
	}

	return options
}

function quoteSql(value: string) {
	return `'${value.replaceAll("'", "''")}'`
}

function buildSeedSql({
	email,
	username,
	passwordHash,
}: {
	email: string
	username: string
	passwordHash: string
}) {
	const normalizedEmail = email.trim().toLowerCase()
	return `
INSERT INTO users (username, email, password_hash)
VALUES (${quoteSql(username)}, ${quoteSql(normalizedEmail)}, ${quoteSql(passwordHash)})
ON CONFLICT(email) DO UPDATE SET
	username = excluded.username,
	password_hash = excluded.password_hash,
	updated_at = CURRENT_TIMESTAMP;
`.trim()
}

function executeSeedSql(sql: string, options: CliOptions) {
	const args = [
		'd1',
		'execute',
		'APP_DB',
		'--command',
		sql,
		'--env',
		options.envName,
		'--config',
		options.configPath,
	]
	if (options.local) {
		args.push('--local')
		if (options.persistTo) {
			args.push('--persist-to', options.persistTo)
		}
	}
	if (options.remote) {
		args.push('--remote')
	}

	const result = runWrangler(args)
	if (result.status !== 0) {
		fail('Failed to write seed user directly to D1.')
	}
}

async function main() {
	const options = parseArgs(process.argv.slice(2))
	const passwordHash = await createPasswordHash(options.password)
	const sql = buildSeedSql({
		email: options.email,
		username: options.username,
		passwordHash,
	})
	executeSeedSql(sql, options)

	console.log(
		`Seeded test account in D1 (${options.local ? 'local' : 'remote'} ${options.envName}): ${options.email}`,
	)
}

await main()
