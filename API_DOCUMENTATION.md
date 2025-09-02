# API Documentation for Kids Ledger

## Overview

This document describes the REST API endpoints for the Kids Ledger application built on Cloudflare Workers with D1 database. All endpoints return JSON responses and use standard HTTP status codes.

## Base URL

```
https://kids-ledger.com/api
```

## Authentication

The API uses URL-based authentication where each ledger is identified by a unique UUID in the URL path. No additional authentication headers are required.

## Response Format

All API responses follow this standard format:

```json
{
  "success": true,
  "data": {},
  "error": null,
  "timestamp": "2024-01-01T00:00:00Z"
}
```

Error responses:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {}
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `422` - Validation Error
- `500` - Internal Server Error

## Endpoints

### Ledger Management

#### Create Ledger
```http
POST /api/ledgers
```

**Request Body:**
```json
{
  "name": "Smith Family Ledger"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Smith Family Ledger",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z",
    "settings": {}
  }
}
```

#### Get Ledger
```http
GET /api/ledgers/{ledgerId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Smith Family Ledger",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z",
    "settings": {},
    "children": [
      {
        "id": "child-1",
        "name": "Emma",
        "avatar": "👧",
        "total_balance": 125.50,
        "accounts": [...]
      }
    ],
    "total_family_balance": 125.50
  }
}
```

#### Update Ledger
```http
PUT /api/ledgers/{ledgerId}
```

**Request Body:**
```json
{
  "name": "Updated Family Ledger",
  "settings": {
    "currency": "USD",
    "theme": "dark"
  }
}
```

#### Delete Ledger
```http
DELETE /api/ledgers/{ledgerId}
```

**Request Body:**
```json
{
  "confirmation": "DELETE_LEDGER"
}
```

### Children Management

#### Get Children
```http
GET /api/ledgers/{ledgerId}/children
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "child-1",
      "name": "Emma",
      "avatar": "👧",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "total_balance": 125.50,
      "account_count": 3
    }
  ]
}
```

#### Add Child
```http
POST /api/ledgers/{ledgerId}/children
```

**Request Body:**
```json
{
  "name": "Liam",
  "avatar": "👦"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "child-2",
    "name": "Liam",
    "avatar": "👦",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

#### Update Child
```http
PUT /api/children/{childId}
```

**Request Body:**
```json
{
  "name": "Emma Smith",
  "avatar": "👧"
}
```

#### Delete Child
```http
DELETE /api/children/{childId}
```

**Request Body:**
```json
{
  "confirmation": "DELETE_CHILD"
}
```

### Account Management

#### Get Accounts
```http
GET /api/children/{childId}/accounts
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "account-1",
      "name": "Savings",
      "type": "savings",
      "color": "#4CAF50",
      "icon": "🏦",
      "sort_order": 0,
      "balance": 75.25,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Create Account
```http
POST /api/children/{childId}/accounts
```

**Request Body:**
```json
{
  "name": "Spending Money",
  "type": "spending",
  "color": "#FF9800",
  "icon": "💰"
}
```

#### Update Account
```http
PUT /api/accounts/{accountId}
```

**Request Body:**
```json
{
  "name": "Updated Account Name",
  "color": "#2196F3",
  "icon": "🎯"
}
```

#### Delete Account
```http
DELETE /api/accounts/{accountId}
```

**Request Body:**
```json
{
  "confirmation": "DELETE_ACCOUNT"
}
```

#### Reorder Accounts
```http
PUT /api/accounts/reorder
```

**Request Body:**
```json
{
  "child_id": "child-1",
  "account_orders": [
    { "id": "account-1", "sort_order": 0 },
    { "id": "account-2", "sort_order": 1 },
    { "id": "account-3", "sort_order": 2 }
  ]
}
```

### Transaction Management

#### Get Transactions
```http
GET /api/accounts/{accountId}/transactions
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `type` (optional): Filter by type ('credit', 'debit')
- `category` (optional): Filter by category
- `start_date` (optional): Filter from date (ISO format)
- `end_date` (optional): Filter to date (ISO format)

**Response:**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "transaction-1",
        "amount": 25.00,
        "type": "credit",
        "category": "allowance",
        "description": "Weekly allowance",
        "created_at": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "total_pages": 3
    }
  }
}
```

#### Add Transaction
```http
POST /api/accounts/{accountId}/transactions
```

**Request Body:**
```json
{
  "amount": 25.00,
  "type": "credit",
  "category": "allowance",
  "description": "Weekly allowance"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "transaction-1",
    "amount": 25.00,
    "type": "credit",
    "category": "allowance",
    "description": "Weekly allowance",
    "created_at": "2024-01-01T00:00:00Z",
    "new_balance": 100.25
  }
}
```

#### Delete Transaction
```http
DELETE /api/transactions/{transactionId}
```

**Request Body:**
```json
{
  "confirmation": "DELETE_TRANSACTION"
}
```

### Quick Amounts

#### Get Quick Amounts
```http
GET /api/ledgers/{ledgerId}/quick-amounts
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "quick-1",
      "amount": 5.00,
      "label": "Small Chore",
      "sort_order": 0,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Add Quick Amount
```http
POST /api/ledgers/{ledgerId}/quick-amounts
```

**Request Body:**
```json
{
  "amount": 10.00,
  "label": "Big Chore"
}
```

#### Update Quick Amount
```http
PUT /api/quick-amounts/{quickAmountId}
```

**Request Body:**
```json
{
  "amount": 15.00,
  "label": "Updated Label"
}
```

#### Delete Quick Amount
```http
DELETE /api/quick-amounts/{quickAmountId}
```

### Goals Management

#### Get Goals
```http
GET /api/accounts/{accountId}/goals
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "goal-1",
      "name": "New Bike",
      "target_amount": 200.00,
      "current_amount": 75.25,
      "target_date": "2024-06-01",
      "is_active": true,
      "progress_percentage": 37.6,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Create Goal
```http
POST /api/accounts/{accountId}/goals
```

**Request Body:**
```json
{
  "name": "New Bike",
  "target_amount": 200.00,
  "target_date": "2024-06-01"
}
```

### Chores Management

#### Get Chores
```http
GET /api/children/{childId}/chores
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "chore-1",
      "name": "Clean Room",
      "description": "Pick up toys and make bed",
      "amount": 5.00,
      "frequency": "weekly",
      "is_active": true,
      "last_completed": "2024-01-01T00:00:00Z",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Create Chore
```http
POST /api/children/{childId}/chores
```

**Request Body:**
```json
{
  "name": "Dishes",
  "description": "Wash and put away dishes",
  "amount": 3.00,
  "frequency": "daily"
}
```

#### Complete Chore
```http
POST /api/chores/{choreId}/complete
```

**Response:**
```json
{
  "success": true,
  "data": {
    "completion_id": "completion-1",
    "transaction_id": "transaction-1",
    "amount_earned": 3.00,
    "completed_at": "2024-01-01T00:00:00Z"
  }
}
```

### Data Export/Import

#### Export Ledger Data
```http
GET /api/ledgers/{ledgerId}/export
```

**Response:**
```json
{
  "success": true,
  "data": {
    "ledger": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Smith Family Ledger",
      "created_at": "2024-01-01T00:00:00Z",
      "settings": {}
    },
    "children": [...],
    "accounts": [...],
    "transactions": [...],
    "quick_amounts": [...],
    "goals": [...],
    "chores": [...],
    "export_date": "2024-01-01T00:00:00Z"
  }
}
```

#### Import Ledger Data
```http
POST /api/ledgers/{ledgerId}/import
```

**Request Body:**
```json
{
  "data": {
    "children": [...],
    "accounts": [...],
    "transactions": [...],
    "quick_amounts": [...],
    "goals": [...],
    "chores": [...]
  },
  "options": {
    "overwrite_existing": false,
    "skip_duplicates": true
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Input validation failed |
| `LEDGER_NOT_FOUND` | Ledger with specified ID not found |
| `CHILD_NOT_FOUND` | Child with specified ID not found |
| `ACCOUNT_NOT_FOUND` | Account with specified ID not found |
| `TRANSACTION_NOT_FOUND` | Transaction with specified ID not found |
| `INSUFFICIENT_FUNDS` | Account balance too low for transaction |
| `INVALID_AMOUNT` | Transaction amount is invalid |
| `DUPLICATE_ENTRY` | Record already exists |
| `CONFIRMATION_REQUIRED` | Confirmation code required for deletion |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `INTERNAL_ERROR` | Internal server error |

## Rate Limiting

- **Standard Endpoints**: 1000 requests per minute per ledger
- **Transaction Endpoints**: 100 requests per minute per ledger
- **Export/Import**: 10 requests per hour per ledger

## Webhooks (Future Enhancement)

```http
POST /webhooks/ledger-updates
```

**Headers:**
```
X-Webhook-Signature: sha256=...
Content-Type: application/json
```

**Body:**
```json
{
  "event": "transaction.created",
  "ledger_id": "550e8400-e29b-41d4-a716-446655440000",
  "data": {
    "transaction_id": "transaction-1",
    "account_id": "account-1",
    "amount": 25.00,
    "type": "credit"
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## SDK Examples

### JavaScript/TypeScript

```typescript
class KidsLedgerAPI {
  constructor(private baseUrl: string) {}

  async createLedger(name: string) {
    const response = await fetch(`${this.baseUrl}/api/ledgers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    return response.json();
  }

  async getLedger(ledgerId: string) {
    const response = await fetch(`${this.baseUrl}/api/ledgers/${ledgerId}`);
    return response.json();
  }

  async addTransaction(accountId: string, transaction: TransactionData) {
    const response = await fetch(`${this.baseUrl}/api/accounts/${accountId}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transaction)
    });
    return response.json();
  }
}
```

### Python

```python
import requests

class KidsLedgerAPI:
    def __init__(self, base_url):
        self.base_url = base_url

    def create_ledger(self, name):
        response = requests.post(
            f"{self.base_url}/api/ledgers",
            json={"name": name}
        )
        return response.json()

    def get_ledger(self, ledger_id):
        response = requests.get(f"{self.base_url}/api/ledgers/{ledger_id}")
        return response.json()

    def add_transaction(self, account_id, transaction_data):
        response = requests.post(
            f"{self.base_url}/api/accounts/{account_id}/transactions",
            json=transaction_data
        )
        return response.json()
```

## Testing

### Test Endpoints

```http
GET /api/health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "database": "connected",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

### Test Data

Use the test ledger ID `test-ledger-123` for development and testing purposes. This ledger has pre-populated data for testing all endpoints.