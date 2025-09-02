# Database Migrations for Kids Ledger

## Overview

This document contains the SQL migration files for setting up the D1 database schema for the Kids Ledger application. Each migration is versioned and can be applied incrementally.

## Migration Files

### 001_initial_schema.sql
```sql
-- Initial database schema for Kids Ledger
-- Version: 001
-- Date: 2024-01-01

-- Create ledgers table
CREATE TABLE IF NOT EXISTS ledgers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    settings TEXT DEFAULT '{}' -- JSON string for ledger settings
);

-- Create children table
CREATE TABLE IF NOT EXISTS children (
    id TEXT PRIMARY KEY,
    ledger_id TEXT NOT NULL,
    name TEXT NOT NULL,
    avatar TEXT NOT NULL, -- emoji or avatar identifier
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ledger_id) REFERENCES ledgers(id) ON DELETE CASCADE
);

-- Create accounts table
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    child_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'savings', 'spending', 'tithing', 'custom'
    color TEXT NOT NULL, -- hex color code
    icon TEXT, -- optional icon identifier
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    type TEXT NOT NULL, -- 'credit', 'debit'
    category TEXT NOT NULL, -- 'allowance', 'gift', 'chore', 'purchase', etc.
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- Create quick_amounts table
CREATE TABLE IF NOT EXISTS quick_amounts (
    id TEXT PRIMARY KEY,
    ledger_id TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    label TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ledger_id) REFERENCES ledgers(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_children_ledger_id ON children(ledger_id);
CREATE INDEX IF NOT EXISTS idx_accounts_child_id ON accounts(child_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_quick_amounts_ledger_id ON quick_amounts(ledger_id);
```

### 002_add_audit_log.sql
```sql
-- Add audit logging table
-- Version: 002
-- Date: 2024-01-02

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    ledger_id TEXT NOT NULL,
    action TEXT NOT NULL, -- 'create', 'update', 'delete'
    table_name TEXT NOT NULL, -- 'ledgers', 'children', 'accounts', 'transactions'
    record_id TEXT NOT NULL,
    old_values TEXT, -- JSON string of old values
    new_values TEXT, -- JSON string of new values
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ledger_id) REFERENCES ledgers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_ledger_id ON audit_logs(ledger_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
```

### 003_add_goals_table.sql
```sql
-- Add savings goals functionality
-- Version: 003
-- Date: 2024-01-03

CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    name TEXT NOT NULL,
    target_amount DECIMAL(10,2) NOT NULL,
    current_amount DECIMAL(10,2) DEFAULT 0,
    target_date DATE,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_goals_account_id ON goals(account_id);
CREATE INDEX IF NOT EXISTS idx_goals_is_active ON goals(is_active);
```

### 004_add_chores_table.sql
```sql
-- Add chore management functionality
-- Version: 004
-- Date: 2024-01-04

CREATE TABLE IF NOT EXISTS chores (
    id TEXT PRIMARY KEY,
    child_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    amount DECIMAL(10,2) NOT NULL,
    frequency TEXT NOT NULL, -- 'once', 'daily', 'weekly', 'monthly'
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chore_completions (
    id TEXT PRIMARY KEY,
    chore_id TEXT NOT NULL,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    transaction_id TEXT,
    FOREIGN KEY (chore_id) REFERENCES chores(id) ON DELETE CASCADE,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_chores_child_id ON chores(child_id);
CREATE INDEX IF NOT EXISTS idx_chores_is_active ON chores(is_active);
CREATE INDEX IF NOT EXISTS idx_chore_completions_chore_id ON chore_completions(chore_id);
```

## Migration Management

### Applying Migrations

```bash
# Apply all migrations
wrangler d1 execute kids-ledger --file=./migrations/001_initial_schema.sql
wrangler d1 execute kids-ledger --file=./migrations/002_add_audit_log.sql
wrangler d1 execute kids-ledger --file=./migrations/003_add_goals_table.sql
wrangler d1 execute kids-ledger --file=./migrations/004_add_chores_table.sql
```

### Migration Script

Create a `migrate.sh` script for easy migration management:

```bash
#!/bin/bash

# Migration script for Kids Ledger D1 database

DB_NAME="kids-ledger"
MIGRATIONS_DIR="./migrations"

echo "Starting database migrations..."

# Apply migrations in order
for migration in $(ls $MIGRATIONS_DIR/*.sql | sort); do
    echo "Applying migration: $(basename $migration)"
    wrangler d1 execute $DB_NAME --file=$migration
    if [ $? -eq 0 ]; then
        echo "✓ Migration applied successfully"
    else
        echo "✗ Migration failed"
        exit 1
    fi
done

echo "All migrations completed successfully!"
```

### Rollback Strategy

For rollback scenarios, create corresponding rollback migrations:

```sql
-- Rollback for 004_add_chores_table.sql
-- Version: 004_rollback
-- Date: 2024-01-04

DROP TABLE IF EXISTS chore_completions;
DROP TABLE IF EXISTS chores;
```

## Database Utilities

### Backup Script

```bash
#!/bin/bash

# Backup script for Kids Ledger D1 database

DB_NAME="kids-ledger"
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)

echo "Creating database backup..."

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Export database
wrangler d1 export $DB_NAME --output=$BACKUP_DIR/backup_$DATE.sql

if [ $? -eq 0 ]; then
    echo "✓ Backup created: $BACKUP_DIR/backup_$DATE.sql"
else
    echo "✗ Backup failed"
    exit 1
fi
```

### Restore Script

```bash
#!/bin/bash

# Restore script for Kids Ledger D1 database

DB_NAME="kids-ledger"
BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file>"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "Restoring database from backup: $BACKUP_FILE"

# Import database
wrangler d1 execute $DB_NAME --file=$BACKUP_FILE

if [ $? -eq 0 ]; then
    echo "✓ Database restored successfully"
else
    echo "✗ Restore failed"
    exit 1
fi
```

## Performance Optimization

### Additional Indexes

```sql
-- Performance optimization indexes
-- Version: 005
-- Date: 2024-01-05

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_transactions_account_created ON transactions(account_id, created_at);
CREATE INDEX IF NOT EXISTS idx_accounts_child_sort ON accounts(child_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_quick_amounts_ledger_sort ON quick_amounts(ledger_id, sort_order);

-- Partial indexes for active records
CREATE INDEX IF NOT EXISTS idx_goals_active ON goals(account_id) WHERE is_active = 1;
CREATE INDEX IF NOT EXISTS idx_chores_active ON chores(child_id) WHERE is_active = 1;
```

### Query Optimization

```sql
-- Views for common queries
CREATE VIEW IF NOT EXISTS account_balances AS
SELECT 
    a.id as account_id,
    a.name as account_name,
    a.type as account_type,
    a.color as account_color,
    c.id as child_id,
    c.name as child_name,
    c.avatar as child_avatar,
    l.id as ledger_id,
    COALESCE(SUM(
        CASE 
            WHEN t.type = 'credit' THEN t.amount 
            ELSE -t.amount 
        END
    ), 0) as balance
FROM accounts a
JOIN children c ON a.child_id = c.id
JOIN ledgers l ON c.ledger_id = l.id
LEFT JOIN transactions t ON a.id = t.account_id
GROUP BY a.id, a.name, a.type, a.color, c.id, c.name, c.avatar, l.id;

CREATE VIEW IF NOT EXISTS child_totals AS
SELECT 
    c.id as child_id,
    c.name as child_name,
    c.avatar as child_avatar,
    l.id as ledger_id,
    SUM(ab.balance) as total_balance
FROM children c
JOIN ledgers l ON c.ledger_id = l.id
JOIN account_balances ab ON c.id = ab.child_id
GROUP BY c.id, c.name, c.avatar, l.id;
```

## Data Validation

### Constraints and Triggers

```sql
-- Data validation constraints
-- Version: 006
-- Date: 2024-01-06

-- Ensure positive amounts for transactions
CREATE TRIGGER IF NOT EXISTS validate_transaction_amount
BEFORE INSERT ON transactions
FOR EACH ROW
BEGIN
    SELECT CASE 
        WHEN NEW.amount <= 0 THEN RAISE(ABORT, 'Transaction amount must be positive')
    END;
END;

-- Ensure valid transaction types
CREATE TRIGGER IF NOT EXISTS validate_transaction_type
BEFORE INSERT ON transactions
FOR EACH ROW
BEGIN
    SELECT CASE 
        WHEN NEW.type NOT IN ('credit', 'debit') THEN RAISE(ABORT, 'Invalid transaction type')
    END;
END;

-- Update timestamps automatically
CREATE TRIGGER IF NOT EXISTS update_ledger_timestamp
AFTER UPDATE ON ledgers
FOR EACH ROW
BEGIN
    UPDATE ledgers SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_child_timestamp
AFTER UPDATE ON children
FOR EACH ROW
BEGIN
    UPDATE children SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_account_timestamp
AFTER UPDATE ON accounts
FOR EACH ROW
BEGIN
    UPDATE accounts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
```

## Monitoring and Maintenance

### Database Statistics

```sql
-- Query to get database statistics
SELECT 
    'ledgers' as table_name,
    COUNT(*) as record_count,
    MAX(created_at) as last_created,
    MAX(updated_at) as last_updated
FROM ledgers
UNION ALL
SELECT 
    'children' as table_name,
    COUNT(*) as record_count,
    MAX(created_at) as last_created,
    MAX(updated_at) as last_updated
FROM children
UNION ALL
SELECT 
    'accounts' as table_name,
    COUNT(*) as record_count,
    MAX(created_at) as last_created,
    MAX(updated_at) as last_updated
FROM accounts
UNION ALL
SELECT 
    'transactions' as table_name,
    COUNT(*) as record_count,
    MAX(created_at) as last_created,
    NULL as last_updated
FROM transactions;
```

### Cleanup Scripts

```sql
-- Cleanup old audit logs (keep last 90 days)
DELETE FROM audit_logs 
WHERE created_at < datetime('now', '-90 days');

-- Cleanup old chore completions (keep last 365 days)
DELETE FROM chore_completions 
WHERE completed_at < datetime('now', '-365 days');
```