ALTER TABLE accounts ADD COLUMN account_type TEXT NOT NULL DEFAULT 'spending';

UPDATE accounts
SET account_type = 'savings'
WHERE LOWER(name) LIKE 'save%' OR LOWER(name) LIKE '%saving%';

ALTER TABLE transactions ADD COLUMN source_type TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE transactions ADD COLUMN source_period TEXT NOT NULL DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_monthly_interest_unique
	ON transactions(account_id, source_type, source_period)
	WHERE source_type = 'monthly_interest' AND source_period <> '';

CREATE TABLE IF NOT EXISTS interest_accruals (
	id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
	account_id INTEGER NOT NULL,
	period TEXT NOT NULL,
	balance_cents INTEGER NOT NULL,
	apy_basis_points INTEGER NOT NULL,
	amount_cents INTEGER NOT NULL,
	transaction_id INTEGER,
	created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
	FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL,
	UNIQUE(account_id, period)
);

CREATE INDEX IF NOT EXISTS idx_interest_accruals_period
	ON interest_accruals(period, account_id);
