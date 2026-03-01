/**
 * One-time data migration script: Custom Auth → Better Auth
 *
 * Run AFTER applying the 0002 Drizzle migration:
 *   pnpm tsx scripts/migrate-to-better-auth.ts
 *
 * What this does:
 * 1. sessions.token = sessions.id  (existing cookie values survive)
 * 2. users.passwordHash → account table (credential provider)
 * 3. user_meta TOTP secrets → two_factor table (TOTP secrets migrate; backup codes do NOT)
 */

import Database from 'better-sqlite3';
import { resolve } from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = resolve(__dirname, '../data/svelte-press.db');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = OFF'); // temporarily disable for migration

// ─── 1. Populate sessions.token from sessions.id ─────────────────────────────

console.log('Step 1: Populating sessions.token = sessions.id for existing rows...');
const sessionsResult = db
	.prepare(`UPDATE sessions SET token = id, updated_at = created_at WHERE token = '' OR token IS NULL`)
	.run();
console.log(`  Updated ${sessionsResult.changes} session row(s).`);

// ─── 2. Migrate passwords from users.password_hash → account table ──────────

console.log('Step 2: Migrating user passwords to account table...');
const users = db.prepare('SELECT id, password_hash FROM users').all() as Array<{
	id: number;
	password_hash: string;
}>;

const insertAccount = db.prepare(`
	INSERT OR IGNORE INTO account (id, user_id, account_id, provider_id, password, created_at, updated_at)
	VALUES (?, ?, ?, 'credential', ?, unixepoch(), unixepoch())
`);

let accountsMigrated = 0;
for (const user of users) {
	const result = insertAccount.run(randomUUID(), user.id, String(user.id), user.password_hash);
	if (result.changes > 0) accountsMigrated++;
}
console.log(`  Created ${accountsMigrated} account row(s).`);

// ─── 3. Migrate TOTP secrets from user_meta → two_factor table ───────────────

console.log('Step 3: Migrating TOTP 2FA secrets to two_factor table...');

const totpSecrets = db
	.prepare(`SELECT user_id, meta_value FROM user_meta WHERE meta_key = 'totp_secret'`)
	.all() as Array<{ user_id: number; meta_value: string }>;

const insertTwoFactor = db.prepare(`
	INSERT OR IGNORE INTO two_factor (id, user_id, secret, backup_codes)
	VALUES (?, ?, ?, '[]')
`);

const enableTwoFactor = db.prepare(`
	UPDATE users SET two_factor_enabled = 1 WHERE id = ?
`);

let totpMigrated = 0;
for (const row of totpSecrets) {
	const result = insertTwoFactor.run(randomUUID(), row.user_id, row.meta_value);
	if (result.changes > 0) {
		enableTwoFactor.run(row.user_id);
		totpMigrated++;
	}
}
console.log(`  Migrated ${totpMigrated} TOTP secret(s).`);
if (totpMigrated > 0) {
	console.log(
		'  NOTE: Backup codes were NOT migrated (format incompatible).' +
			' Users with 2FA must regenerate backup codes from the profile page.'
	);
}

// ─── 4. Update users.updated_at from 0 → registered_at ──────────────────────

console.log('Step 4: Setting users.updated_at = registered_at for existing rows...');
const usersUpdated = db
	.prepare(`UPDATE users SET updated_at = registered_at WHERE updated_at = 0`)
	.run();
console.log(`  Updated ${usersUpdated.changes} user row(s).`);

db.pragma('foreign_keys = ON');
db.close();

console.log('\nMigration complete. ✓');
