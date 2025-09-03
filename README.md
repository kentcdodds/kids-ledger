# Welcome to React Router!

A modern, production-ready template for building full-stack React applications
using React Router.

## Features

- 🚀 Server-side rendering
- ⚡️ Hot Module Replacement (HMR)
- 📦 Asset bundling and optimization
- 🔄 Data loading and mutations
- 🔒 TypeScript by default
- 🎉 TailwindCSS for styling
- 📖 [React Router docs](https://reactrouter.com/)

## Getting Started

### Installation

Install the dependencies:

```bash
npm install
```

### Development

Start the development server with HMR:

```bash
npm run dev
```

Your application will be available at `http://localhost:5173`.

## Previewing the Production Build

Preview the production build locally:

```bash
npm run preview
```

## Building for Production

Create a production build:

```bash
npm run build
```

## Deployment

Deployment is done using the Wrangler CLI.

To build and deploy directly to production:

```sh
npm run deploy
```

To deploy a preview URL:

```sh
npm run deploy:preview
```

You can then promote a version to production after verification or roll it out
progressively.

```sh
npx wrangler versions deploy
```

### Pull Request Deployments

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
