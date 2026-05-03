import { fail, writeGeneratedWranglerD1Config } from './resource-utils'

type CliOptions = {
	wranglerConfigPath: string
	outConfigPath: string
	d1DatabaseName: string
	d1DatabaseId: string
}

function parseArgs(argv: Array<string>) {
	const options: CliOptions = {
		wranglerConfigPath: '',
		outConfigPath: '',
		d1DatabaseName: '',
		d1DatabaseId: '',
	}

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index]
		if (!arg) continue
		switch (arg) {
			case '--wrangler-config': {
				options.wranglerConfigPath = argv[index + 1] ?? ''
				index += 1
				break
			}
			case '--out-config': {
				options.outConfigPath = argv[index + 1] ?? ''
				index += 1
				break
			}
			case '--d1-database-name': {
				options.d1DatabaseName = argv[index + 1] ?? ''
				index += 1
				break
			}
			case '--d1-database-id': {
				options.d1DatabaseId = argv[index + 1] ?? ''
				index += 1
				break
			}
			default: {
				if (arg.startsWith('-')) {
					fail(`Unknown flag: ${arg}`)
				}
			}
		}
	}

	if (!options.wranglerConfigPath) {
		fail('Missing required flag: --wrangler-config <path>')
	}
	if (!options.outConfigPath) {
		fail('Missing required flag: --out-config <path>')
	}
	if (!options.d1DatabaseName) {
		fail('Missing required flag: --d1-database-name <name>')
	}
	if (!options.d1DatabaseId) {
		fail('Missing required flag: --d1-database-id <id>')
	}

	return options
}

const options = parseArgs(process.argv.slice(2))
await writeGeneratedWranglerD1Config({
	baseConfigPath: options.wranglerConfigPath,
	outConfigPath: options.outConfigPath,
	envName: 'preview',
	d1Bindings: [
		{
			binding: 'APP_DB',
			databaseName: options.d1DatabaseName,
			databaseId: options.d1DatabaseId,
		},
	],
})
