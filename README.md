# Rewards, Tasks, Campaigns, Referrals & Mini-Games Platform

Production-grade Next.js (App Router) + Payload CMS + PostgreSQL + Redis application.

## Stack
- **Next.js 16** (App Router, TypeScript) — frontend + API routes
- **Payload CMS 3** — admin panel, collections, access control, hooks
- **PostgreSQL** — source of truth for all data (via `@payloadcms/db-postgres` / drizzle)
- **Redis** — rate limiting, distributed locks, caching only (never the source of truth for money)
- **Tailwind CSS**

## Getting started

```bash
npm install
cp .env.example .env
```

Edit `.env`:
- `DATABASE_URL` — a PostgreSQL connection string (create the DB first, e.g. `createdb rewards`)
- `PAYLOAD_SECRET` — `openssl rand -hex 32`
- `DATA_ENCRYPTION_KEY` — `openssl rand -hex 32` (exactly 64 hex chars — used to encrypt payout details at rest)
- `CRON_SECRET` — any random string, used to authorize `POST /api/cron/tick`
- `REDIS_URL` — a local or hosted Redis instance (optional in dev; an in-memory fallback is used if unset, but **required in production**)

Then:

```bash
npm run dev
```

On first run with `DB_PUSH=true` (the default in `.env.example`), Payload auto-creates the schema. Visit
`http://localhost:3000/admin` to create your first admin, or run the seed script:

```bash
npm run seed          # creates a Super Admin (SEED_ADMIN_EMAIL/PASSWORD in .env), sample tasks/games/campaign
npm run db:guards     # adds DB-level triggers that block edits to the ledger/audit tables even via raw SQL
```

## Tests

```bash
npm test          # run once
npm run test:watch
```

Unit tests cover the parts of the codebase where a silent bug would be most costly: money parsing/formatting
(`src/lib/money.ts`), timezone/day-boundary math (`src/lib/time.ts`), payout-detail encryption
(`src/lib/crypto.ts`), the `AppError` → HTTP status mapping, and the Sudoku solver/generator/validator
(`src/games/sudoku-core.ts`). They don't need a database or Redis. Writing these caught a real bug: the
solver could go blind to a conflict between two *given* cells (its bitmasks only guard new placements
against existing ones), so `search()` now runs an `isConsistent()` check up front.

## Production

```bash
npm run migrate:create   # generate a migration from your current schema changes
npm run migrate          # apply migrations (set DB_PUSH=false in production)
npm run build
npm start
```

Run `npm run reconcile` periodically (e.g. nightly cron) to verify every wallet balance still matches its
ledger — it never writes anything, only reports mismatches.

## Architecture notes

- **Money** is always an integer number of paise (`src/lib/money.ts`). No floating point in balance logic.
- **WalletService** (`src/services/wallet.ts`) is the only code path allowed to change a balance. Every
  change takes a Postgres advisory transaction lock, checks an idempotency key, and writes an immutable
  ledger row (`wallet-transactions`) in the same DB transaction as the wallet update.
- **Redis** is used only for rate limiting, soft locks and caching of public content. If Redis is down,
  those features fail open/soft — money correctness is guaranteed by PostgreSQL alone (advisory locks +
  unique idempotency keys), never by Redis.
- **Games** (`src/games/*`) are pure, server-authoritative engines: `start()` returns a client-safe view and
  a server-only state (answers/solutions); `submit()` re-derives the score from the server state — the
  client's report of "I won" is never trusted directly.
- **Admin roles**: SUPER_ADMIN, ADMIN, FINANCE_ADMIN, CONTENT_MANAGER, SUPPORT_AGENT — see `src/access/index.ts`.
- **Audit log** and **wallet ledger** are append-only at both the Payload hook level
  (`src/hooks/immutable.ts`) and, optionally, the Postgres trigger level (`npm run db:guards`).

## Scheduler

Call `POST /api/cron/tick` with header `Authorization: Bearer $CRON_SECRET` once a minute (any external
scheduler — cron, a hosting platform's scheduled functions, etc.) to activate/expire scheduled tasks, games
and campaigns, send campaign start/ending notifications, and expire abandoned game sessions.
