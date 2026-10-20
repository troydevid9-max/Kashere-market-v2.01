# Kashere Student Marketplace

A student-only marketplace for Federal University of Kashere with **escrow payments**: the buyer pays Kashere, the seller delivers, the buyer confirms with a photo, and only then is the seller paid.

**Stack:** React 19 + Vite (PWA) · Node 22.13+ / Express 5 · Knex + Postgres · Paystack for payments.

## Develop against Render

The normal development command starts only the Vite frontend. API and upload requests are proxied to your Render service, so you do not need a local API server or database.

Create a `.env.local` file in the project root and set your Render service URL:

```env
VITE_API_PROXY_TARGET=https://your-render-service.onrender.com
```

Then run:

```
npm install
npm run dev
```

Open http://localhost:5173. Keep the Render service's `DATABASE_URL` set to your Render Postgres connection string.

| Demo login | Password | What it is |
|---|---|---|
| `FUK/CS/21/0045` | `password123` | Aisha: verified vendor with listings and sales |
| `FUK/ME/23/0056` | `password123` | Musa: verified student (good for buying) |
| `FUK/CH/22/0078` | `password123` | Zainab: NOT verified (see the verification flow) |
| `ADMIN` | `Admin@12345` | Admin panel at `/admin` |

With no Paystack key set, payments run in **demo mode**: pressing Pay settles instantly with no real money. Demo mode is automatically disabled in production.

### Other commands
```
npm test          # backend tests (SQLite is explicitly enabled only for this test process)
npm run build     # production build of the website (served by the API in production)
npm start         # run the API (+ built website if dist/ exists)
npm run icons     # regenerate PWA/home-screen icons from public/brand/logo.jpg
npm run create-admin   # make an admin against the configured Postgres database
```
To run the tests against Postgres: `TEST_DATABASE_URL=postgres://user:pass@localhost:5432/db npm test`

## How the money works
See [docs/MONEY.md](docs/MONEY.md). In one line: buyer pays → money held → seller ships → buyer confirms with photo → seller wallet is credited (price − 6% commission + delivery fee). Every wallet change is a row in an append-only ledger.

## Docs
- [docs/API.md](docs/API.md): every endpoint
- [docs/MONEY.md](docs/MONEY.md): escrow rules, states, commission, refunds, disputes
- [docs/DEPLOY.md](docs/DEPLOY.md): going live (Render + Neon + Paystack), security checklist

## Project layout
```
src/            React app (pages, components, contexts, api.js)
server/         Express API
  routes/       auth, catalog, orders, wallet, account, messages, admin
  lib/          ledger, escrow engine (orders.js), payments, paystack, uploads, auth
  schema.js     all database tables
  seed.js       demo data (dev only)
  tests/        API test suite
public/brand/   logo.jpg (standalone bag-and-K image); icons in public/icons
```
