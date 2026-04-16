# DIZEE Tickets Backend

Monorepo backend for DIZEE Tickets — a music-specific live event ticketing command center.

## Architecture

```
packages/
├── shared/           # Mongoose models, types, validators, utils, email, Redis, TicketSocket
├── dashboard-api/    # Express API for authenticated dashboard (artists, promoters, admin)
├── webhook-api/      # Express API for inbound webhooks (TicketSocket, Stripe)
├── workers/          # BullMQ job processors (sync, click batching, lifecycle)
└── public-api/       # Lightweight public endpoints (link redirect, guest list, public show data)
```

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment config
cp .env.example .env.dev
# Edit .env.dev with your MongoDB URI, Redis URL, etc.

# Seed demo data
npm run seed

# Start all services in development
npm run dev

# Or start individually
npm run dev:dashboard    # Port 8000
npm run dev:webhook      # Port 8001 (via packages/webhook-api)
```

## Services

| Service | Port | Purpose |
|---------|------|---------|
| Dashboard API | 8000 | Authenticated dashboard endpoints |
| Webhook API | 8001 | TicketSocket + Stripe webhook handlers |
| Public API | 8002 | Link redirects, public show data, guest list |
| Workers | — | Background job processors |

## API Routes (Dashboard API)

```
POST   /api/v1/auth/signup
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
GET    /api/v1/auth/me

POST   /api/v1/orgs
GET    /api/v1/orgs/mine
GET    /api/v1/orgs/:id
PUT    /api/v1/orgs/:id
POST   /api/v1/orgs/:id/invite
GET    /api/v1/orgs/:id/members

GET    /api/v1/shows
POST   /api/v1/shows
GET    /api/v1/shows/:id
PUT    /api/v1/shows/:id
GET    /api/v1/shows/:id/stats
POST   /api/v1/shows/:id/sync

GET    /api/v1/tours
POST   /api/v1/tours
GET    /api/v1/tours/:id

GET    /api/v1/ticket-links
POST   /api/v1/ticket-links
GET    /api/v1/ticket-links/:id
GET    /api/v1/ticket-links/:id/stats

GET    /api/v1/guest-lists/show/:showId
POST   /api/v1/guest-lists
POST   /api/v1/guest-lists/requests/:requestId/approve
POST   /api/v1/guest-lists/requests/:requestId/reject
GET    /api/v1/guest-lists/show/:showId/export

GET    /api/v1/fans
GET    /api/v1/fans/export
GET    /api/v1/fans/:id

GET    /api/v1/artists
POST   /api/v1/artists
GET    /api/v1/promoters
POST   /api/v1/promoters
GET    /api/v1/venues
POST   /api/v1/venues
```

## Tech Stack

- **Runtime:** Node.js 20+, TypeScript
- **Framework:** Express 4
- **Database:** MongoDB (Mongoose 8)
- **Cache/Queue:** Redis (ioredis + BullMQ)
- **Auth:** JWT (access + refresh tokens)
- **Email:** Mailgun
- **Payments:** Stripe (scaffolded)
- **Monorepo:** Turborepo + npm workspaces

## Demo Accounts (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Admin | eddie@dizee.com | password123 |
| Artist Manager | manager@sidepiece.com | password123 |
| Promoter | rep@livenation.com | password123 |
