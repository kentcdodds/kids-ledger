# Kids Ledger Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing the Kids Ledger application using Cloudflare Workers, D1 database, and React Router. Follow these phases to build the application incrementally.

## Prerequisites

### Required Tools
- Node.js 18+ and npm
- Wrangler CLI (`npm install -g wrangler`)
- Git for version control
- A Cloudflare account

### Development Environment Setup

1. **Install Dependencies**
```bash
npm install
```

2. **Configure Wrangler**
```bash
wrangler login
```

3. **Create D1 Database**
```bash
wrangler d1 create kids-ledger
```

4. **Update wrangler.jsonc**
Add the D1 database binding to your `wrangler.jsonc`:

```json
{
  "name": "kids-ledger",
  "compatibility_date": "2025-04-04",
  "main": "./workers/app.ts",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "kids-ledger",
      "database_id": "your-database-id"
    }
  ]
}
```

## Phase 1: Core Infrastructure

### Step 1: Database Setup

1. **Create Migration Directory**
```bash
mkdir -p migrations
```

2. **Create Initial Schema**
Create `migrations/001_initial_schema.sql` with the content from `DATABASE_MIGRATIONS.md`.

3. **Apply Migration**
```bash
wrangler d1 execute kids-ledger --file=./migrations/001_initial_schema.sql
```

### Step 2: Basic Worker Setup

1. **Update Worker Entry Point**
Update `workers/app.ts`:

```typescript
import { createRequestHandler } from "@remix-run/cloudflare";
import * as build from "@remix-run/dev/server-build";

const handler = createRequestHandler({
  build,
  mode: process.env.NODE_ENV,
  getLoadContext: (context) => {
    return {
      env: context.env,
    };
  },
});

export default handler;
```

2. **Add Type Definitions**
Create `types/database.ts`:

```typescript
export interface Ledger {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  settings: Record<string, any>;
}

export interface Child {
  id: string;
  ledger_id: string;
  name: string;
  avatar: string;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  child_id: string;
  name: string;
  type: 'savings' | 'spending' | 'tithing' | 'custom';
  color: string;
  icon?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  account_id: string;
  amount: number;
  type: 'credit' | 'debit';
  category: string;
  description?: string;
  created_at: string;
}
```

### Step 3: Basic API Routes

1. **Create API Handler**
Create `workers/api.ts`:

```typescript
import { Router } from 'itty-router';
import { createLedger, getLedger } from './handlers/ledgers';
import { getChildren, addChild, updateChild, deleteChild } from './handlers/children';
import { getAccounts, createAccount, updateAccount, deleteAccount } from './handlers/accounts';
import { getTransactions, addTransaction, deleteTransaction } from './handlers/transactions';

const router = Router();

// Ledger routes
router.post('/api/ledgers', createLedger);
router.get('/api/ledgers/:id', getLedger);
router.put('/api/ledgers/:id', updateLedger);
router.delete('/api/ledgers/:id', deleteLedger);

// Children routes
router.get('/api/ledgers/:id/children', getChildren);
router.post('/api/ledgers/:id/children', addChild);
router.put('/api/children/:id', updateChild);
router.delete('/api/children/:id', deleteChild);

// Account routes
router.get('/api/children/:id/accounts', getAccounts);
router.post('/api/children/:id/accounts', createAccount);
router.put('/api/accounts/:id', updateAccount);
router.delete('/api/accounts/:id', deleteAccount);

// Transaction routes
router.get('/api/accounts/:id/transactions', getTransactions);
router.post('/api/accounts/:id/transactions', addTransaction);
router.delete('/api/transactions/:id', deleteTransaction);

export default router;
```

2. **Create Handler Functions**
Create `workers/handlers/ledgers.ts`:

```typescript
import { generateId } from '../utils/id';
import { createResponse } from '../utils/response';

export async function createLedger(request: Request, env: any) {
  try {
    const { name } = await request.json();
    
    if (!name || typeof name !== 'string') {
      return createResponse({ error: 'Name is required' }, 400);
    }

    const id = generateId();
    const now = new Date().toISOString();

    await env.DB.prepare(`
      INSERT INTO ledgers (id, name, created_at, updated_at, settings)
      VALUES (?, ?, ?, ?, ?)
    `).bind(id, name, now, now, '{}').run();

    return createResponse({
      id,
      name,
      created_at: now,
      updated_at: now,
      settings: {}
    }, 201);
  } catch (error) {
    return createResponse({ error: 'Failed to create ledger' }, 500);
  }
}

export async function getLedger(request: Request, env: any) {
  try {
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();

    const ledger = await env.DB.prepare(`
      SELECT * FROM ledgers WHERE id = ?
    `).bind(id).first();

    if (!ledger) {
      return createResponse({ error: 'Ledger not found' }, 404);
    }

    // Get children with accounts and balances
    const children = await env.DB.prepare(`
      SELECT 
        c.*,
        COUNT(a.id) as account_count,
        COALESCE(SUM(
          CASE 
            WHEN t.type = 'credit' THEN t.amount 
            ELSE -t.amount 
          END
        ), 0) as total_balance
      FROM children c
      LEFT JOIN accounts a ON c.id = a.child_id
      LEFT JOIN transactions t ON a.id = t.account_id
      WHERE c.ledger_id = ?
      GROUP BY c.id
      ORDER BY c.created_at
    `).bind(id).all();

    return createResponse({
      ...ledger,
      children: children.results,
      total_family_balance: children.results.reduce((sum, child) => sum + child.total_balance, 0)
    });
  } catch (error) {
    return createResponse({ error: 'Failed to get ledger' }, 500);
  }
}
```

3. **Create Utility Functions**
Create `workers/utils/response.ts`:

```typescript
export function createResponse(data: any, status = 200) {
  return new Response(JSON.stringify({
    success: status < 400,
    data: status < 400 ? data : null,
    error: status >= 400 ? data : null,
    timestamp: new Date().toISOString()
  }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
```

Create `workers/utils/id.ts`:

```typescript
export function generateId(): string {
  return crypto.randomUUID();
}
```

## Phase 2: React Router Setup

### Step 1: Route Configuration

1. **Update Routes File**
Update `app/routes.ts`:

```typescript
import { createRoutesFromElements, Route } from "react-router";
import { root } from "./root";
import { index } from "./routes/index";
import { newLedger } from "./routes/new-ledger";
import { ledger } from "./routes/ledger";
import { children } from "./routes/children";
import { childDetail } from "./routes/child-detail";
import { settings } from "./routes/settings";

export const routes = createRoutesFromElements(
  <Route path="/" element={root}>
    <Route index element={index} />
    <Route path="new" element={newLedger} />
    <Route path=":ledgerId" element={ledger}>
      <Route index element={ledger} />
      <Route path="children" element={children} />
      <Route path="children/:childId" element={childDetail} />
      <Route path="settings" element={settings} />
    </Route>
  </Route>
);
```

### Step 2: Create Route Components

1. **Home Page**
Create `app/routes/index.tsx`:

```typescript
import { Link } from "react-router";
import { useState } from "react";

export default function Index() {
  const [ledgerName, setLedgerName] = useState("");

  const handleCreateLedger = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch("/api/ledgers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: ledgerName })
      });
      
      const result = await response.json();
      
      if (result.success) {
        window.location.href = `/${result.data.id}`;
      }
    } catch (error) {
      console.error("Failed to create ledger:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Kids Ledger</h1>
          <p className="text-gray-600">Family money management made simple</p>
        </div>
        
        <form onSubmit={handleCreateLedger} className="space-y-4">
          <div>
            <label htmlFor="ledgerName" className="block text-sm font-medium text-gray-700 mb-2">
              Family Ledger Name
            </label>
            <input
              type="text"
              id="ledgerName"
              value={ledgerName}
              onChange={(e) => setLedgerName(e.target.value)}
              placeholder="e.g., Smith Family"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            Create Family Ledger
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Your family will get a unique URL to access your ledger
          </p>
        </div>
      </div>
    </div>
  );
}
```

2. **Ledger Overview**
Create `app/routes/ledger.tsx`:

```typescript
import { useLoaderData, Link } from "react-router";
import { useState } from "react";

export async function loader({ params }: { params: { ledgerId: string } }) {
  const response = await fetch(`/api/ledgers/${params.ledgerId}`);
  return response.json();
}

export default function Ledger() {
  const { data: ledger } = useLoaderData<typeof loader>();
  const [showAddChild, setShowAddChild] = useState(false);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{ledger.name}</h1>
        <p className="text-gray-600">Total Family Balance: ${ledger.total_family_balance.toFixed(2)}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ledger.children.map((child: any) => (
          <div key={child.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <span className="text-3xl mr-3">{child.avatar}</span>
              <div>
                <h3 className="text-xl font-semibold">{child.name}</h3>
                <p className="text-gray-600">{child.account_count} accounts</p>
              </div>
            </div>
            
            <div className="text-2xl font-bold text-green-600 mb-4">
              ${child.total_balance.toFixed(2)}
            </div>
            
            <Link
              to={`/${ledger.id}/children/${child.id}`}
              className="block w-full text-center bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              View Details
            </Link>
          </div>
        ))}
        
        <button
          onClick={() => setShowAddChild(true)}
          className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-gray-400 transition-colors"
        >
          <div className="text-center">
            <div className="text-4xl mb-2">👶</div>
            <p className="text-gray-600">Add Child</p>
          </div>
        </button>
      </div>

      {showAddChild && (
        <AddChildModal
          ledgerId={ledger.id}
          onClose={() => setShowAddChild(false)}
          onSuccess={() => window.location.reload()}
        />
      )}
    </div>
  );
}
```

## Phase 3: Core Features Implementation

### Step 1: Child Management

1. **Create AddChildModal Component**
Create `app/components/AddChildModal.tsx`:

```typescript
import { useState } from "react";

interface AddChildModalProps {
  ledgerId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const AVATARS = ["👶", "👧", "👦", "👩", "👨", "🧒", "👵", "👴"];

export function AddChildModal({ ledgerId, onClose, onSuccess }: AddChildModalProps) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`/api/ledgers/${ledgerId}/children`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, avatar })
      });
      
      const result = await response.json();
      
      if (result.success) {
        onSuccess();
      }
    } catch (error) {
      console.error("Failed to add child:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-semibold mb-4">Add Child</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Avatar
            </label>
            <div className="grid grid-cols-4 gap-2">
              {AVATARS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setAvatar(emoji)}
                  className={`p-2 text-2xl rounded-md border-2 ${
                    avatar === emoji ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
            >
              Add Child
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### Step 2: Account Management

1. **Create Account Components**
Create `app/components/AccountCard.tsx`:

```typescript
interface AccountCardProps {
  account: {
    id: string;
    name: string;
    type: string;
    color: string;
    icon?: string;
    balance: number;
  };
  onAddTransaction: (accountId: string) => void;
}

export function AccountCard({ account, onAddTransaction }: AccountCardProps) {
  return (
    <div 
      className="bg-white rounded-lg shadow-md p-4 border-l-4"
      style={{ borderLeftColor: account.color }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          {account.icon && <span className="text-2xl mr-2">{account.icon}</span>}
          <h3 className="font-semibold">{account.name}</h3>
        </div>
        <span className="text-sm text-gray-500 capitalize">{account.type}</span>
      </div>
      
      <div className="text-2xl font-bold mb-3">
        ${account.balance.toFixed(2)}
      </div>
      
      <button
        onClick={() => onAddTransaction(account.id)}
        className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
      >
        Add Money
      </button>
    </div>
  );
}
```

### Step 3: Transaction System

1. **Create Transaction Modal**
Create `app/components/TransactionModal.tsx`:

```typescript
import { useState } from "react";

interface TransactionModalProps {
  accountId: string;
  accountName: string;
  onClose: () => void;
  onSuccess: () => void;
}

const QUICK_AMOUNTS = [1, 5, 10, 20, 50];

export function TransactionModal({ accountId, accountName, onClose, onSuccess }: TransactionModalProps) {
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"credit" | "debit">("credit");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`/api/accounts/${accountId}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(amount),
          type,
          category,
          description
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        onSuccess();
      }
    } catch (error) {
      console.error("Failed to add transaction:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-semibold mb-4">Add Transaction - {accountName}</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            
            <div className="flex space-x-2 mt-2">
              {QUICK_AMOUNTS.map((quickAmount) => (
                <button
                  key={quickAmount}
                  type="button"
                  onClick={() => setAmount(quickAmount.toString())}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  ${quickAmount}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "credit" | "debit")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="credit">Add Money</option>
              <option value="debit">Spend Money</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., allowance, gift, chore"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
            >
              Add Transaction
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

## Phase 4: Advanced Features

### Step 1: Drag and Drop Account Reordering

1. **Install Dependencies**
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

2. **Create Sortable Account List**
Create `app/components/SortableAccounts.tsx`:

```typescript
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableAccountItem } from './SortableAccountItem';

interface SortableAccountsProps {
  accounts: any[];
  onReorder: (newOrder: any[]) => void;
}

export function SortableAccounts({ accounts, onReorder }: SortableAccountsProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: any) {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = accounts.findIndex(account => account.id === active.id);
      const newIndex = accounts.findIndex(account => account.id === over.id);
      
      const newOrder = arrayMove(accounts, oldIndex, newIndex);
      onReorder(newOrder);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={accounts.map(account => account.id)}
        strategy={verticalListSortingStrategy}
      >
        {accounts.map((account) => (
          <SortableAccountItem key={account.id} account={account} />
        ))}
      </SortableContext>
    </DndContext>
  );
}
```

### Step 2: Data Export/Import

1. **Create Export Component**
Create `app/components/DataExport.tsx`:

```typescript
import { useState } from "react";

interface DataExportProps {
  ledgerId: string;
}

export function DataExport({ ledgerId }: DataExportProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    
    try {
      const response = await fetch(`/api/ledgers/${ledgerId}/export`);
      const result = await response.json();
      
      if (result.success) {
        const blob = new Blob([JSON.stringify(result.data, null, 2)], {
          type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kids-ledger-${ledgerId}-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Failed to export data:", error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">Data Management</h3>
      
      <div className="space-y-4">
        <div>
          <h4 className="font-medium mb-2">Export Data</h4>
          <p className="text-sm text-gray-600 mb-3">
            Download all your ledger data as a JSON file for backup.
          </p>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {exporting ? "Exporting..." : "Export Data"}
          </button>
        </div>
        
        <div>
          <h4 className="font-medium mb-2">Import Data</h4>
          <p className="text-sm text-gray-600 mb-3">
            Restore your ledger from a previously exported file.
          </p>
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>
      </div>
    </div>
  );
}
```

## Phase 5: Testing and Deployment

### Step 1: Testing

1. **Create Test Scripts**
Create `scripts/test-api.js`:

```javascript
const BASE_URL = 'http://localhost:8787';

async function testAPI() {
  console.log('Testing Kids Ledger API...');
  
  // Test ledger creation
  const createResponse = await fetch(`${BASE_URL}/api/ledgers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test Family' })
  });
  
  const createResult = await createResponse.json();
  console.log('Created ledger:', createResult);
  
  if (createResult.success) {
    const ledgerId = createResult.data.id;
    
    // Test getting ledger
    const getResponse = await fetch(`${BASE_URL}/api/ledgers/${ledgerId}`);
    const getResult = await getResponse.json();
    console.log('Retrieved ledger:', getResult);
  }
}

testAPI().catch(console.error);
```

2. **Run Tests**
```bash
node scripts/test-api.js
```

### Step 2: Deployment

1. **Build for Production**
```bash
npm run build
```

2. **Deploy to Cloudflare**
```bash
npm run deploy
```

3. **Verify Deployment**
```bash
wrangler tail
```

## Next Steps

After completing these phases, consider implementing:

1. **Real-time Updates**: Use Cloudflare's WebSocket support
2. **Mobile App**: Create a PWA with offline support
3. **Advanced Analytics**: Add spending reports and trends
4. **Multi-currency Support**: Handle different currencies
5. **Goal Setting**: Add savings goals with progress tracking
6. **Chore Management**: Integrated chore tracking system

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify D1 database is created and bound correctly
   - Check `wrangler.jsonc` configuration
   - Ensure database migrations are applied

2. **CORS Errors**
   - Add proper CORS headers in API responses
   - Check request origins in development

3. **Build Errors**
   - Clear build cache: `rm -rf .react-router`
   - Reinstall dependencies: `rm -rf node_modules && npm install`

4. **Deployment Issues**
   - Check Wrangler configuration
   - Verify Cloudflare account permissions
   - Check build output for errors

### Getting Help

1. Check the Cloudflare Workers documentation
2. Review React Router v7 documentation
3. Check the project's GitHub issues
4. Join the Cloudflare Discord community