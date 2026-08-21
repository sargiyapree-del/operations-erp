# Operations ERP

A web-based Operations ERP for inventory, work orders, stock transfers, and customer order management. This repository is organized as a small monorepo with separate web and API applications.

## Technology

- Frontend: React, TypeScript, and Vite
- Backend: Node.js, Express, and TypeScript
- Database: PostgreSQL
- ORM: Prisma

## Repository layout

```text
.
├── backend/                 # Express API and Prisma schema
├── frontend/                # React single-page application
├── docker-compose.yml       # Local PostgreSQL service
└── .env.example             # Docker Compose database defaults
```

## Prerequisites

- Node.js 20 or later
- npm 10 or later
- Docker Desktop (required for the local PostgreSQL container)

## Local development

1. Copy the environment templates before starting services:

   ```powershell
   Copy-Item .env.example .env
   Copy-Item backend/.env.example backend/.env
   Copy-Item frontend/.env.example frontend/.env
   ```

2. Install dependencies:

   ```powershell
   npm install --prefix backend
   npm install --prefix frontend
   ```

3. Start PostgreSQL:

   ```powershell
   docker compose up -d db
   ```

4. Generate the Prisma client and start the applications in separate terminals:

   ```powershell
   npm run prisma:generate --prefix backend
   npm run dev --prefix backend
   npm run dev --prefix frontend
   ```

The frontend runs at `http://localhost:5173`, the API at `http://localhost:3000`, and the API health endpoint at `http://localhost:3000/api/health`.

## Phase 1 scope

This foundation includes only development infrastructure and an API health check. ERP data models and business modules are intentionally deferred to later phases.
