import { verifyPassword } from '#server/password-hash.ts'
import { usersTable, type AppDatabase } from '#worker/db.ts'

const dummyPasswordHash =
	'pbkdf2_sha256$100000$00000000000000000000000000000000$0000000000000000000000000000000000000000000000000000000000000000'

type VerifyUserCredentialsResult = { ok: false } | { ok: true; userId: number }

export async function verifyUserCredentials(
	db: AppDatabase,
	email: string,
	password: string,
): Promise<VerifyUserCredentialsResult> {
	const userRecord = await db.findOne(usersTable, {
		where: { email },
	})
	if (!userRecord) {
		await verifyPassword(password, dummyPasswordHash)
		return { ok: false }
	}
	const passwordValid = await verifyPassword(password, userRecord.password_hash)
	if (!passwordValid) {
		return { ok: false }
	}
	return { ok: true, userId: userRecord.id }
}
