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
- **Product Traceability** — Visual timeline from supplier/production to sale
- **Orders & Wholesale** — Retail sales and shop supply with payment tracking
- **Payments & Expenses** — Credit tracking and expense categorization
- **Reports** — Sales, purchases, production, inventory, profit reports with CSV export

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for:
- Database entity relationships
- Inventory flow diagrams
- Product costing strategy
- Development plan

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend:** Next.js Server Actions
- **Database:** PostgreSQL with Prisma ORM 7
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
├── generated/prisma/    # Generated Prisma client
prisma/
├── schema.prisma        # Database schema
└── seed.ts              # Sample data
docs/
└── ARCHITECTURE.md      # System design documentation
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

## Sample Seed Data

After seeding, you'll have:
- Products: Dodol (purchased), Gulab Jamun (manufactured), Jujubes
- Raw materials: Sugar, Flour, Milk Powder, Ghee
- Packaging: Containers, Labels, Stickers
- Gulab Jamun recipe with ingredients
- Sample supplier, customers, purchase, and expenses

## License

Private — Sweet Fusion Business Management System
