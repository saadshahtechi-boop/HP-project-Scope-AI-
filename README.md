# Techciko Health Suite — AI Smart Clinic Management System

An enterprise-grade clinic management platform demonstrating real healthcare
workflows end-to-end: patient registration, appointments, live queue, doctor
consultation with SOAP notes, laboratory, pharmacy with stock ledger, billing,
analytics, and an AI assistant.

## Architecture

Monorepo with two apps and shared infrastructure:

```
techciko-health-suite/
├── apps/
│   ├── api/          NestJS + Prisma + PostgreSQL + JWT/RBAC  (11 modules)
│   └── web/          Next.js + React + TanStack Query + Tailwind + Recharts
├── docker-compose.yml   Postgres · Redis · API · Web
└── .env.example
```

### Backend modules (`apps/api/src/modules`)

Auth · Patients · Appointments · Queue · Consultations · Billing · Laboratory ·
Inventory · Pharmacy · Reports · AI.

Clinical entities loosely follow FHIR R4 (Patient, Encounter, Observation,
Condition, MedicationRequest, ServiceRequest, DiagnosticReport). Highlights:

- **Encounter is the clinical spine** — SOAP, diagnoses, observations, and
  prescriptions all hang off it, written atomically when a visit completes.
- **Stock is ledger-derived** — on-hand = Σ StockMovement deltas; dispensing
  uses FEFO (first-expiry-first-out).
- **Money in integer cents** — invoice status is derived from payments, never
  set by hand.
- **AI is deterministic-first** — templated document generation and a
  rules-based NL-analytics engine that calls the real Reports functions. Every
  output carries a demonstration-only disclaimer. An LLM path sits behind a flag.

## Running locally

```bash
# 1. Configure environment
cp .env.example .env
#    then set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET (>= 32 chars each):
#    openssl rand -base64 48

# 2. Bring everything up
docker compose up --build

# 3. Apply the schema and seed a full demo clinic
docker compose exec api npx prisma migrate deploy
docker compose exec api npx prisma db seed
```

- Web app: http://localhost:3000
- API:     http://localhost:4000/api

### Seed data

The seed generates a realistic active clinic — 500 patients, staff across all
roles, ~2000 appointments spread over a 120-day window, and the encounters,
prescriptions, lab results, inventory, and invoices that flow from them, using
clinically plausible distributions (common diagnoses common, ~12% no-shows,
~20% abnormal labs, a handful of near-expiry batches).

## Development (without Docker)

```bash
# API
cd apps/api
npm install
npx prisma generate
npx prisma migrate dev
npm run start:dev        # http://localhost:4000/api

# Web (separate shell)
cd apps/web
npm install
npm run dev              # http://localhost:3000
```

## Notes

- Requires Node 20+ if running outside Docker.
- The AI assistant runs deterministically by default and needs no API key.
- All AI output is a demonstration draft and not clinical advice.
