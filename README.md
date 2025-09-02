# Kids Ledger - Family Money Management App

A comprehensive family money management application built with Cloudflare Workers, D1 database, and React Router. Help parents teach their children about financial responsibility through hands-on money tracking.

## 🚀 Features

- **Family Management**: Add multiple children with unique avatars and names
- **Account System**: Create custom money accounts (Savings, Spending, Tithing, etc.)
- **Transaction Tracking**: Add/remove money with detailed history and categories
- **Visual Interface**: Color-coded accounts with emojis and intuitive design
- **Quick Actions**: Preset amounts for common transactions
- **Data Export**: Backup and restore functionality
- **URL-based Access**: Secure, unique URLs for each family ledger
- **Real-time Updates**: Instant balance updates across devices

## 🛠 Technology Stack

- **Frontend**: React Router v7 with TypeScript
- **Backend**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Styling**: TailwindCSS
- **Deployment**: Cloudflare Pages/Workers
- **Authentication**: URL-based (unique ledger identifiers)

## 📚 Documentation

This project includes comprehensive documentation to help you understand and implement the Kids Ledger application:

### Core Documentation
- **[Implementation Plan](KIDS_LEDGER_PLAN.md)** - Complete architectural overview and design decisions
- **[Database Migrations](DATABASE_MIGRATIONS.md)** - SQL schema and migration management
- **[API Documentation](API_DOCUMENTATION.md)** - Complete REST API reference
- **[Implementation Guide](IMPLEMENTATION_GUIDE.md)** - Step-by-step development guide

### Key Design Decisions

1. **No User Accounts**: Each ledger is identified by a unique, cryptographically secure URL
2. **D1 Database**: SQLite-based database for data persistence and performance
3. **React Router**: Server-side rendering with data loading and mutations
4. **Real-time Updates**: WebSocket-like updates using Cloudflare's real-time capabilities

## 🏗 Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Router  │    │ Cloudflare      │    │   D1 Database   │
│   Frontend      │◄──►│   Workers       │◄──►│   (SQLite)      │
│                 │    │   API           │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Database Schema

- **Ledgers**: Family ledger information and settings
- **Children**: Individual children with avatars and names
- **Accounts**: Money accounts per child (Savings, Spending, etc.)
- **Transactions**: Money movement history with categories
- **Quick Amounts**: Preset transaction values
- **Goals**: Savings goals with progress tracking
- **Chores**: Chore management with automatic payments

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Wrangler CLI (`npm install -g wrangler`)
- Cloudflare account

### Installation

1. **Clone and Install**
```bash
git clone <repository-url>
cd kids-ledger
npm install
```

2. **Configure Cloudflare**
```bash
wrangler login
wrangler d1 create kids-ledger
```

3. **Update Configuration**
Add your D1 database binding to `wrangler.jsonc`:
```json
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "kids-ledger",
      "database_id": "your-database-id"
    }
  ]
}
```

4. **Apply Database Migrations**
```bash
wrangler d1 execute kids-ledger --file=./migrations/001_initial_schema.sql
```

5. **Start Development**
```bash
npm run dev
```

### Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Deploy to Cloudflare
npm run deploy

# Preview production build
npm run preview
```

## 📖 Usage

### Creating a Family Ledger

1. Visit the application homepage
2. Enter your family name (e.g., "Smith Family")
3. Click "Create Family Ledger"
4. You'll receive a unique URL like: `https://kids-ledger.com/550e8400-e29b-41d4-a716-446655440000`

### Adding Children

1. Click "Add Child" on your ledger dashboard
2. Enter the child's name and select an avatar
3. The child will appear on your dashboard with $0.00 balance

### Creating Accounts

1. Click on a child to view their details
2. Click "Add Account" to create money categories
3. Choose account type (Savings, Spending, Tithing, Custom)
4. Select colors and icons for visual organization

### Adding Transactions

1. Click "Add Money" on any account
2. Enter amount (or use quick amount buttons)
3. Select transaction type (Add/Spend)
4. Add category and optional description
5. Balance updates instantly

## 🔒 Security

- **URL-based Authentication**: Each ledger has a unique, cryptographically secure identifier
- **Data Isolation**: Complete isolation between different family ledgers
- **No Cross-Access**: Impossible to access other families' data
- **Audit Trail**: All changes logged with timestamps

## 📱 Features

### Core Functionality
- ✅ Family and child management
- ✅ Multiple account types per child
- ✅ Transaction tracking with categories
- ✅ Real-time balance calculations
- ✅ Quick amount presets
- ✅ Visual account organization

### Advanced Features
- ✅ Drag-and-drop account reordering
- ✅ Data export/import functionality
- ✅ Transaction history with filtering
- ✅ Mobile-responsive design
- ✅ Dark/light theme support
- ✅ Offline capabilities (PWA)

### Future Enhancements
- 🔄 Savings goals with progress tracking
- 🔄 Chore management system
- 🔄 Multi-currency support
- 🔄 Advanced analytics and reports
- 🔄 Family sharing and synchronization
- 🔄 Educational content integration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the documentation files in this repository
- **Issues**: Report bugs and request features via GitHub Issues
- **Community**: Join our Discord community for help and discussions

## 🙏 Acknowledgments

- Built with ❤️ using React Router and Cloudflare Workers
- Inspired by traditional envelope budgeting methods
- Designed for families teaching financial responsibility to children

---

**Kids Ledger** - Making family money management fun and educational! 🎉
