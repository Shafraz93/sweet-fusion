# Sweet Fusion - Business Management System

A complete business management web application for **Sweet Fusion**, a sweets and food products business. Built with Next.js, TypeScript, Tailwind CSS, PostgreSQL, and Prisma ORM.

## Features

- **Dashboard** — Sales, expenses, profit, inventory value, outstanding balances, low stock alerts, charts
- **Product Management** — Purchased (resale) and manufactured products with full costing
- **Supplier & Customer Management** — Profiles with complete transaction history
- **Purchase Management** — Finished products, raw materials, and packaging materials
- **Recipe & Production** — Formulas, batch production with ingredient deduction
- **Packaging** — Track packaging materials and costs per product
- **Inventory** — Unified stock tracking with complete movement history
- **Orders & Sales** — Retail and shop sales with payment tracking, per-line profit
- **Payments & Expenses** — Credit tracking and expense categorization
- **Reports** — Sales, purchases, production, inventory, profit reports with CSV export
- **Mobile App** — React Native app for creating and viewing orders on a phone (see [mobile/README.md](mobile/README.md))

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for:
- Database entity relationships
- Inventory flow diagrams
- Product costing strategy
- Development plan

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend:** Next.js Server Actions + REST routes for the mobile app
- **Database:** PostgreSQL with Prisma ORM 7
- **Mobile:** React Native via Expo SDK 57 with expo-router
- **Charts:** Recharts
- **Validation:** Zod + React Hook Form

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database (or use `npx prisma dev` for local Prisma Postgres)

### Installation

```bash
# Install dependencies
npm install

# Start local PostgreSQL (required — keep running in a separate terminal)
npm run db:dev

# Or restart if you see "Connection terminated unexpectedly":
npm run db:dev:restart

# Configure environment — copy .env.example and use the DATABASE_URL from `prisma dev` output
cp .env.example .env

# Generate Prisma client, push schema, seed data
npm run db:generate
npm run db:push
npm run db:seed

# Start development server (in another terminal)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Database Setup Options

**Option A — Prisma local Postgres (recommended for dev):**
```bash
npx prisma dev
npm run db:push
npm run db:seed
```

**Option B — Existing PostgreSQL:**
```env
DATABASE_URL="postgresql://user:password@localhost:5432/sweet_fusion"
```

## Project Structure

```
src/
├── app/(dashboard)/     # All app pages with sidebar layout
├── components/          # UI components, forms, charts, layout
├── lib/
│   ├── actions/         # Server actions for each module
│   ├── inventory.ts     # Inventory movement logic
│   ├── costing.ts       # Product cost calculations
│   └── prisma.ts        # Database client
│   ├── api/             # DTOs and helpers for the REST API
│   ├── auth/            # Password check, token signing, session helpers
│   ├── numbering.ts     # Collision-safe record numbers (ORD-, LOT-, ...)
│   └── prisma.ts        # Database client
├── app/api/             # REST routes consumed by the mobile app
├── app/login/           # Password gate
├── proxy.ts             # Auth gate for all routes (Next.js 16 proxy)
├── generated/prisma/    # Generated Prisma client
mobile/                  # React Native (Expo) app — see mobile/README.md
prisma/
├── schema.prisma        # Database schema
└── seed.ts              # Sample data
docs/
└── ARCHITECTURE.md      # System design documentation
```

## Authentication

The app is protected by a single shared password used by both the web app and
the mobile app.

```env
APP_PASSWORD="choose-something-strong"
AUTH_SECRET="long-random-value"
```

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

How it works:

- `src/proxy.ts` gates every route. Browsers without a valid session cookie are
  redirected to `/login`; API requests without a valid bearer token get a 401.
- Signing in at `/login` sets an HTTP-only cookie signed with `AUTH_SECRET`.
- The mobile app posts to `/api/auth/login` and receives a bearer token instead.
- API route handlers re-check authorization themselves, so a change to the proxy
  matcher cannot silently expose data.

> **If `APP_PASSWORD` is empty, authentication is disabled and the app is
> publicly readable.** This keeps local development frictionless, but it must be
> set in production. Remember to add both variables in the Vercel dashboard.

Changing `AUTH_SECRET` signs everyone out of both the web app and the phone.

## Mobile App

A React Native app in [`mobile/`](mobile/README.md) covers the orders workflow:
browse and search orders, view order details with cost and profit, and create
new orders (including adding a customer on the fly).

```bash
cd mobile
npm install
npm start
```

On the login screen enter the server address (e.g. your Vercel URL) and the
`APP_PASSWORD`. See [mobile/README.md](mobile/README.md) for connecting to a
local dev server from a physical phone.

The mobile app is a thin client: costing, stock movements, and order numbering
all run on the server through the same functions the web forms use.

## REST API

These routes exist for the mobile app. All except `/api/auth/login` require an
`Authorization: Bearer <token>` header.

| Method | Route | Purpose |
|--------|-------|---------|
| `POST` | `/api/auth/login` | Exchange the password for a token |
| `GET` | `/api/auth/session` | Check whether a stored token is still valid |
| `GET` | `/api/orders` | List orders (`?q=`, `?limit=`, `?offset=`) |
| `POST` | `/api/orders` | Create an order |
| `GET` | `/api/orders/[id]` | Order detail with line items |
| `GET` | `/api/products` | Active products with price and stock |
| `GET` | `/api/customers` | Customers with order counts |
| `POST` | `/api/customers` | Create a customer |

Responses are plain JSON — Prisma `Decimal` values are converted to numbers in
`src/lib/api/dto.ts` so clients never parse database-specific types.

## Record Numbering

Human-readable numbers (`ORD-0001`, `LOT-0002`, ...) are generated in
`src/lib/numbering.ts` from the **highest existing number**, not a row count.
A count goes stale as soon as a record is deleted and then produces a number
that already exists, which caused `Unique constraint failed on lotNumber`.
Creates are also retried on a unique-violation so the web app and the phone can
insert at the same time.

Verify with:

```bash
npx tsx -r dotenv/config scripts/verify-numbering.ts
```

## Key Business Rules

1. Every stock change creates an `InventoryMovement` record
2. Purchases automatically update inventory and create product lots
3. Production deducts raw materials and creates finished product lots
4. Packaging tracks material usage and updates product cost
5. Sales and wholesale reduce finished product inventory
6. Historical costs are frozen at transaction time
7. Negative inventory is blocked by default (configurable in Settings)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:migrate` | Run migrations |
| `npm run db:seed` | Seed sample data |
| `npm run db:studio` | Open Prisma Studio |
| `npm run mobile` | Start the Expo dev server for the mobile app |
| `npm run mobile:install` | Install the mobile app's dependencies |
| `npm run smoke:api` | Check the mobile API against a running dev server |
| `npm run verify:numbering` | Confirm generated record numbers can't collide |

## Sample Seed Data

After seeding, you'll have:
- Products: Dodol (purchased), Gulab Jamun (manufactured), Jujubes
- Raw materials: Sugar, Flour, Milk Powder, Ghee
- Packaging: Containers, Labels, Stickers
- Gulab Jamun recipe with ingredients
- Sample supplier, customers, purchase, and expenses

## License

Private — Sweet Fusion Business Management System
