import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fail, runWrangler } from './resource-utils'
import { createTemporaryDirectory } from '../temp-directory'

type CliOptions = {
	configPath: string
	mode: 'local' | 'remote'
	envName: string
}

const testUser = {
	email: 'kody@kcd.dev',
	password: 'kodylovesyou',
}

function parseArgs(argv: Array<string>): CliOptions {
	const options: CliOptions = {
		configPath: 'wrangler.jsonc',
		mode: 'local',
		envName: process.env.CLOUDFLARE_ENV ?? 'production',
	}

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index]
		if (!arg) continue
		switch (arg) {
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
			case '--local': {
				options.mode = 'local'
				break
			}
			case '--remote': {
				options.mode = 'remote'
				break
			}
			default: {
				if (arg.startsWith('-')) {
					fail(`Unknown flag: ${arg}`)
				}
			}
		}
	}

	if (!options.configPath) {
		fail('Missing required flag value: --config <path>')
	}

	if (options.mode === 'remote' && !process.env.CLOUDFLARE_API_TOKEN) {
		fail(
			'Missing CLOUDFLARE_API_TOKEN (required for remote D1 seeding operations).',
		)
	}

	return options
}

async function createPasswordHash(password: string) {
	const module = await import('#server/password-hash.ts')
	return module.createPasswordHash(password)
}

function sqlString(value: string) {
	return `'${value.replaceAll("'", "''")}'`
}

function buildSeedSql({
	email,
	passwordHash,
}: {
	email: string
	passwordHash: string
}) {
	const normalizedEmail = email.trim().toLowerCase()
	const escapedEmail = sqlString(normalizedEmail)
	const escapedPasswordHash = sqlString(passwordHash)
	const householdName = sqlString('Kody Test Household')
	const kidOneName = sqlString('Avery')
	const kidOneEmoji = sqlString('🦖')
	const kidTwoName = sqlString('Milo')
	const kidTwoEmoji = sqlString('🦄')
	const spendingAccountName = sqlString('Spending')
	const savingAccountName = sqlString('Saving')
	const givingAccountName = sqlString('Giving')
	const successNote = sqlString('Weekly chore payout')
	const spendNote = sqlString('Toy dinosaur purchase')
	const saveNote = sqlString('Matched savings bonus')

	return `
INSERT INTO users (username, email, password_hash)
VALUES (${escapedEmail}, ${escapedEmail}, ${escapedPasswordHash})
ON CONFLICT(email) DO UPDATE SET
	username = excluded.username,
	password_hash = excluded.password_hash,
	updated_at = CURRENT_TIMESTAMP;

DELETE FROM households
WHERE user_id = (SELECT id FROM users WHERE email = ${escapedEmail});

INSERT INTO households (user_id, name)
VALUES (
	(SELECT id FROM users WHERE email = ${escapedEmail}),
	${householdName}
);

INSERT INTO kids (household_id, name, emoji, sort_order)
VALUES
	(
		(SELECT id FROM households WHERE user_id = (SELECT id FROM users WHERE email = ${escapedEmail})),
		${kidOneName},
		${kidOneEmoji},
		0
	),
	(
		(SELECT id FROM households WHERE user_id = (SELECT id FROM users WHERE email = ${escapedEmail})),
		${kidTwoName},
		${kidTwoEmoji},
		1
	);

INSERT INTO accounts (kid_id, name, color_token, sort_order)
VALUES
	(
		(SELECT id FROM kids WHERE household_id = (SELECT id FROM households WHERE user_id = (SELECT id FROM users WHERE email = ${escapedEmail})) AND name = ${kidOneName}),
		${spendingAccountName},
		'blue',
		0
	),
	(
		(SELECT id FROM kids WHERE household_id = (SELECT id FROM households WHERE user_id = (SELECT id FROM users WHERE email = ${escapedEmail})) AND name = ${kidOneName}),
		${savingAccountName},
		'green',
		1
	),
	(
		(SELECT id FROM kids WHERE household_id = (SELECT id FROM households WHERE user_id = (SELECT id FROM users WHERE email = ${escapedEmail})) AND name = ${kidTwoName}),
		${spendingAccountName},
		'purple',
		0
	),
	(
		(SELECT id FROM kids WHERE household_id = (SELECT id FROM households WHERE user_id = (SELECT id FROM users WHERE email = ${escapedEmail})) AND name = ${kidTwoName}),
		${givingAccountName},
		'orange',
		1
	);

INSERT INTO quick_amount_presets (household_id, amount_cents, sort_order)
VALUES
	(
		(SELECT id FROM households WHERE user_id = (SELECT id FROM users WHERE email = ${escapedEmail})),
		100,
		0
	),
	(
		(SELECT id FROM households WHERE user_id = (SELECT id FROM users WHERE email = ${escapedEmail})),
		250,
		1
	),
	(
		(SELECT id FROM households WHERE user_id = (SELECT id FROM users WHERE email = ${escapedEmail})),
		500,
		2
	);

INSERT INTO transactions (household_id, kid_id, account_id, amount_cents, note, created_at)
VALUES
	(
		(SELECT id FROM households WHERE user_id = (SELECT id FROM users WHERE email = ${escapedEmail})),
		(SELECT id FROM kids WHERE household_id = (SELECT id FROM households WHERE user_id = (SELECT id FROM users WHERE email = ${escapedEmail})) AND name = ${kidOneName}),
		(SELECT id FROM accounts WHERE kid_id = (SELECT id FROM kids WHERE household_id = (SELECT id FROM households WHERE user_id = (SELECT id FROM users WHERE email = ${escapedEmail})) AND name = ${kidOneName}) AND name = ${spendingAccountName}),
		1000,
		${successNote},
		datetime('now', '-3 days')
	),
	(
		(SELECT id FROM households WHERE user_id = (SELECT id FROM users WHERE email = ${escapedEmail})),
		(SELECT id FROM kids WHERE household_id = (SELECT id FROM households WHERE user_id = (SELECT id FROM users WHERE email = ${escapedEmail})) AND name = ${kidOneName}),
		(SELECT id FROM accounts WHERE kid_id = (SELECT id FROM kids WHERE household_id = (SELECT id FROM households WHERE user_id = (SELECT id FROM users WHERE email = ${escapedEmail})) AND name = ${kidOneName}) AND name = ${spendingAccountName}),
		-450,
		${spendNote},
		datetime('now', '-2 days')
	),
	(
		(SELECT id FROM households WHERE user_id = (SELECT id FROM users WHERE email = ${escapedEmail})),
		(SELECT id FROM kids WHERE household_id = (SELECT id FROM households WHERE user_id = (SELECT id FROM users WHERE email = ${escapedEmail})) AND name = ${kidTwoName}),
		(SELECT id FROM accounts WHERE kid_id = (SELECT id FROM kids WHERE household_id = (SELECT id FROM households WHERE user_id = (SELECT id FROM users WHERE email = ${escapedEmail})) AND name = ${kidTwoName}) AND name = ${givingAccountName}),
		300,
		${saveNote},
		datetime('now', '-1 day')
	);
`.trim()
}

async function main() {
	const options = parseArgs(process.argv.slice(2))
	const passwordHash = await createPasswordHash(testUser.password)
	const seedSql = buildSeedSql({
		email: testUser.email,
		passwordHash,
	})
	await using temporaryDirectory =
		await createTemporaryDirectory('kids-ledger-seed-')
	const sqlFilePath = path.join(temporaryDirectory.path, 'seed.sql')
	await writeFile(sqlFilePath, `${seedSql}\n`, 'utf8')

	const args: Array<string> = [
		'd1',
		'execute',
		'APP_DB',
		options.mode === 'remote' ? '--remote' : '--local',
		'--config',
		options.configPath,
		'--env',
		options.envName,
		'--file',
		sqlFilePath,
	]

	const result = runWrangler(args, { quiet: true })
	if (result.status !== 0) {
		fail('Failed to seed test data into APP_DB.')
	}

	console.log(`Seeded test data for ${testUser.email}.`)
}

await main()
