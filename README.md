# Kashere Student Marketplace

A student-only marketplace for Federal University of Kashere with **escrow payments**: the buyer pays Kashere, the seller delivers, the buyer confirms with a photo, and only then is the seller paid.

**Stack:** React 19 + Vite (PWA) · Node 22.13+ / Express 5 · Knex (SQLite locally, Postgres in production) · Paystack for payments.

## Run it locally

You need **Node.js 22.13 or newer** (get the LTS from nodejs.org). Local data uses the SQLite built into Node, so there is nothing to compile and no Visual Studio needed.

```
npm install
npm run seed      # once: creates demo users, products and orders in a local SQLite file
npm run dev       # starts the API (port 3001) and the website (port 5173) together
```

Open http://localhost:5173

| Demo login | Password | What it is |
|---|---|---|
| `FUK/CS/21/0045` | `password123` | Aisha: verified vendor with listings and sales |
| `FUK/ME/23/0056` | `password123` | Musa: verified student (good for buying) |
| `FUK/CH/22/0078` | `password123` | Zainab: NOT verified (see the verification flow) |
| `ADMIN` | `Admin@12345` | Admin panel at `/admin` |

With no Paystack key set, payments run in **demo mode**: pressing Pay settles instantly with no real money. Demo mode is automatically disabled in production.

### Other commands
```
npm test          # 23 backend tests (escrow, wallet, permissions, uploads, webhook...)
npm run build     # production build of the website (served by the API in production)
npm start         # run the API (+ built website if dist/ exists)
npm run icons     # regenerate PWA/home-screen icons from public/brand/logo.jpg
npm run create-admin   # make a real admin: ADMIN_EMAIL=... ADMIN_PASSWORD=... (12+ chars)
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
public/brand/   logo.jpg lives here; icons in public/icons
```
