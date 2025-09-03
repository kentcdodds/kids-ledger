# Kids Ledger

A simple, mobile-friendly expense tracking app for managing your kids' accounts
and expenses. No login required - just create a ledger and start tracking!

## Features

### 🏠 Home Screen

- Beautiful landing page with unique logo and clear app description
- Feature highlights explaining the app's benefits
- Step-by-step guide on how to use the app
- Direct link to create your first ledger

### 📝 Create Ledger

- Simple form to create a new ledger with a custom name
- Mobile-optimized input fields and buttons
- Automatic redirect to the ledger after creation

### 📊 Ledger Management

- **Full CRUD Operations**: Create, read, update, and delete kids and their
  accounts
- **Mobile-Friendly Drag & Drop**: Reorder kids and accounts by dragging them on
  mobile devices
- **Real-time Balance Updates**: Add or remove funds from accounts with simple
  +/- buttons
- **Inline Editing**: Click on names and emojis to edit them directly
- **Responsive Design**: Optimized for mobile devices with touch-friendly
  controls

### 🎯 Key Features

- **No Login Required**: Each ledger gets a unique URL that serves as your
  access key
- **Emoji Avatars**: Personalize each kid with their favorite emoji
- **Multiple Accounts**: Create different accounts for each kid (Savings,
  Allowance, etc.)
- **Balance Tracking**: Keep running balances for each account
- **Mobile-First**: Designed specifically for mobile use with touch-optimized
  interactions

## Technology Stack

- **Frontend**: React Router v7 with TypeScript
- **Styling**: Tailwind CSS v4 with custom theme
- **Backend**: Cloudflare Workers with D1 SQLite database
- **Database**: SQLite with automatic migrations
- **Validation**: Zod schema validation

## Getting Started

1. **Create a Ledger**: Visit the home page and click "Create Your First Ledger"
2. **Add Kids**: Use the "Add Kid" button to add your children with names and
   emoji avatars
3. **Create Accounts**: For each kid, add accounts like "Savings", "Allowance",
   etc.
4. **Track Expenses**: Use the +/- buttons to update account balances
5. **Reorder**: Drag and drop kids and accounts to reorder them

## Mobile Features

- **Touch-Optimized**: All buttons and controls are sized for comfortable touch
  interaction
- **Drag & Drop**: Intuitive drag-and-drop reordering works seamlessly on mobile
- **Responsive Layout**: Automatically adapts to different screen sizes
- **Fast Loading**: Optimized for mobile network conditions

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Deploy to Cloudflare
npm run deploy

# Type checking
npm run typecheck
```

## Database Schema

The app uses a simple three-table schema:

- **ledgers**: Main ledger information
- **kids**: Children with emoji avatars and names
- **accounts**: Individual accounts for each kid with balances

All tables include automatic timestamps and sort order fields for drag-and-drop
functionality.

## Security & Privacy

- No user accounts or authentication required
- Ledger access is controlled by the unique URL
- Data is stored securely in Cloudflare D1
- No personal data is collected beyond what you enter

## Deploys

This project includes automatic PR preview deployments with isolated databases.
When you create a pull request:

1. **Automatic Deployment**: Each PR is automatically deployed to a temporary
   worker with the name `kids-ledger-pr-{PR_NUMBER}`
2. **Isolated Database**: Each PR gets its own temporary D1 database with the
   name `kids-ledger-pr-{PR_NUMBER}`, ensuring no interference with production
   data
3. **Preview URL**: You'll get a unique URL for each PR to test changes before
   merging
4. **Database Migrations**: The temporary database automatically runs all
   migrations when the worker starts up, ensuring the schema is up-to-date
5. **Automatic Cleanup**: When the PR is closed or merged, both the temporary
   worker and database are automatically cleaned up

The deployment workflow runs on:

- Push to main branch (production deployment)
- Pull request events (preview deployment with isolated database)
- Pull request closure (cleanup of worker and database)

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already
configured for a simple default starting experience. You can use whatever CSS
framework you prefer.

---

Built with ❤️ using React Router.

## Contributing

This is a simple, focused app designed for family use. The codebase is clean and
well-documented, making it easy to understand and extend.
