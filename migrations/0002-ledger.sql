CREATE TABLE IF NOT EXISTS households (
	id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
	user_id INTEGER NOT NULL UNIQUE,
	name TEXT NOT NULL DEFAULT 'My Household',
	created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_households_user_id ON households(user_id);

CREATE TABLE IF NOT EXISTS kids (
	id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
	household_id INTEGER NOT NULL,
	name TEXT NOT NULL,
	emoji TEXT NOT NULL,
	sort_order INTEGER NOT NULL DEFAULT 0,
	is_archived INTEGER NOT NULL DEFAULT 0,
	archived_at TEXT NOT NULL DEFAULT '',
	created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_kids_household_sort
	ON kids(household_id, is_archived, sort_order, id);

CREATE TABLE IF NOT EXISTS accounts (
	id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
	kid_id INTEGER NOT NULL,
	name TEXT NOT NULL,
	color_token TEXT NOT NULL,
	sort_order INTEGER NOT NULL DEFAULT 0,
	is_archived INTEGER NOT NULL DEFAULT 0,
	archived_at TEXT NOT NULL DEFAULT '',
	created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (kid_id) REFERENCES kids(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_accounts_kid_sort
	ON accounts(kid_id, is_archived, sort_order, id);

CREATE TABLE IF NOT EXISTS transactions (
	id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
	household_id INTEGER NOT NULL,
	kid_id INTEGER NOT NULL,
	account_id INTEGER NOT NULL,
	amount_cents INTEGER NOT NULL,
	note TEXT NOT NULL DEFAULT '',
	created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,
	FOREIGN KEY (kid_id) REFERENCES kids(id) ON DELETE RESTRICT,
	FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_transactions_household_created
	ON transactions(household_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_kid_created
	ON transactions(kid_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_account_created
	ON transactions(account_id, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS quick_amount_presets (
	id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
	household_id INTEGER NOT NULL,
	amount_cents INTEGER NOT NULL,
	sort_order INTEGER NOT NULL DEFAULT 0,
	created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_quick_amount_presets_household_sort
	ON quick_amount_presets(household_id, sort_order, id);
