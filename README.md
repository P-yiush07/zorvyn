# Finance Data Processing and Access Control Backend

NestJS backend assignment implementation for a finance dashboard system with RBAC, financial records, analytics APIs, Prisma + MongoDB persistence, validation, centralized error handling, and unit tests.

## Tech Stack

- NestJS
- Prisma ORM + MongoDB
- JWT auth (`passport-jwt`, `@nestjs/jwt`)
- Rate limiting (`@nestjs/throttler`)
- Validation (`class-validator`, `class-transformer`)
- Swagger API docs
- Jest unit testing + smoke E2E testing

## Assignment Requirement Mapping

- **User and Role Management**: `Auth` and `Users` modules manage user creation/login, role assignment, and active/inactive status.
- **Financial Records Management**: `Records` module provides CRUD with soft delete, filtering, and pagination.
- **Dashboard Summary APIs**: `Dashboard` module provides summary totals, category totals, trends, and recent activity.
- **Access Control Logic**: JWT guard + roles guard enforce role-based access at endpoint level.
- **Validation and Error Handling**: Global validation pipe, DTO-level constraints, Prisma-aware exception mapping filter.
- **Data Persistence**: Prisma schema with MongoDB models (`User`, `FinancialRecord`).

## Project Structure

- `src/common`: shared decorators, enums, guards, filters, interceptors, exceptions
- `src/prisma`: Prisma module/service singleton
- `src/modules/auth`: register/login, JWT strategy
- `src/modules/users`: admin user management
- `src/modules/records`: record CRUD/filtering
- `src/modules/dashboard`: summary and analytics endpoints
- `prisma/schema.prisma`: data model and enums

## Data Model

- `User`: email, password hash, role, status, timestamps
- `FinancialRecord`: amount, type, category, date, notes, creator, updater/deleter audit fields, soft delete timestamp

## Architecture and Design Decisions

- Modular domain-based design (`auth`, `users`, `records`, `dashboard`) to keep business logic isolated.
- Guards + decorators for RBAC (`JwtAuthGuard`, `RolesGuard`, `@Roles`) instead of scattered controller checks.
- Global validation and exception filter for predictable API behavior.
- Request/response logging with request IDs for easier debugging and traceability.
- Prisma + MongoDB chosen for fast development with typed ORM access.

## Role Matrix

- `VIEWER`: read dashboard summary + recent activity
- `ANALYST`: viewer rights + read records + category totals + trends
- `ADMIN`: full user and record management

## API Endpoints

### Auth
- `POST /api/v1/auth/register` (first user bootstrap, first user becomes ADMIN)
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh` (rotate access/refresh tokens)
- `POST /api/v1/auth/change-password` (protected, invalidates refresh sessions)

### Users (ADMIN only)
- `POST /api/v1/users`
- `GET /api/v1/users`
- `PATCH /api/v1/users/:id`

### Records
- `POST /api/v1/records` (ADMIN)
- `GET /api/v1/records` (ANALYST, ADMIN)
- `GET /api/v1/records/:id` (ANALYST, ADMIN)
- `PATCH /api/v1/records/:id` (ADMIN)
- `DELETE /api/v1/records/:id` (ADMIN, soft delete)

### Dashboard
- `GET /api/v1/dashboard/summary` (VIEWER, ANALYST, ADMIN)
- `GET /api/v1/dashboard/category-totals` (ANALYST, ADMIN)
- `GET /api/v1/dashboard/recent-activity` (VIEWER, ANALYST, ADMIN)
- `GET /api/v1/dashboard/trends?range=weekly|monthly` (ANALYST, ADMIN)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy env file:
   ```bash
   cp .env.example .env
   ```
3. Set values in `.env`:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `JWT_EXPIRES_IN`
   - `REFRESH_JWT_SECRET`
   - `REFRESH_JWT_EXPIRES_IN`
4. Generate Prisma client:
   ```bash
   npx prisma generate
   ```
5. Start app:
   ```bash
   npm run start:dev
   ```

## Run with Docker

Run API + MongoDB together:

```bash
docker compose up --build
```

This starts:
- API at `http://localhost:8080`
- Swagger at `http://localhost:8080/api/docs`
- MongoDB at `mongodb://localhost:27017`

To stop containers:

```bash
docker compose down
```

To stop and remove DB volume:

```bash
docker compose down -v
```


## Health Check

- Endpoint: `GET /api/v1/health`
- Purpose: Quick readiness check for local/dev/deploy verification.

## Swagger API Docs

- URL: `http://localhost:<PORT>/api/docs` (example: `http://localhost:8080/api/docs`)
- Includes bearer auth config, route tags, DTO-based request docs, and status responses.
- Click **Authorize** in Swagger and paste token as: `Bearer <accessToken>`

## Evaluator Quick Flow (Swagger + cURL)

Use this exact sequence if protected APIs are returning `401`/`403`:

1. Register the first user (auto ADMIN):

```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@finance.local",
    "password": "StrongPass123",
    "name": "Finance Admin"
  }'
```

2. Login and copy `accessToken` from response:

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@finance.local",
    "password": "StrongPass123"
  }'
```

3. Use token to create a new user (ADMIN endpoint):

```bash
curl -X POST http://localhost:8080/api/v1/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <paste_access_token_here>" \
  -d '{
    "email": "analyst@finance.local",
    "password": "StrongPass123",
    "name": "Data Analyst",
    "role": "ANALYST",
    "status": "ACTIVE"
  }'
```

4. In Swagger UI:
   - Open `/api/docs`
   - Click **Authorize**
   - Enter `Bearer <paste_access_token_here>`
   - Call protected endpoints (`/users`, `/records`, `/dashboard/*`)

## Validation and Error Strategy

- Global whitelist + non-whitelisted field rejection
- DTO constraints for body/query validation (including max-length and password complexity checks)
- Date range validation for records query (`startDate <= endDate`)
- Central exception filter with consistent error payload
- Prisma known errors (`P2002`, `P2023`) mapped to clear HTTP responses

## Security Enhancements

- JWT-based authentication with role checks on protected endpoints.
- Bootstrap rule: only first registered user can become `ADMIN`.
- Endpoint-level rate limiting for auth APIs (`/auth/register`, `/auth/login`).
- Audit fields on records (`updatedById`, `deletedById`) for change traceability.

## Testing

Run unit tests:

```bash
npm run test
```

Run coverage:

```bash
npm run test:cov
```

Run smoke E2E:

```bash
npm run test:e2e
```

Covered areas:
- Auth service login/negative paths
- Users service create/update negative paths
- Records service pagination/create/not-found/date-range validation paths
- Dashboard service aggregation/trend logic
- Roles guard authorization rules
- End-to-end smoke flow (register -> login -> create record -> fetch summary)

## Assumptions and Tradeoffs

- Bootstrap-friendly registration: first user can become admin.
- Soft delete used for records to preserve financial history.
- Summary and trend aggregation are computed in service layer for clarity in assessment context.
- Prisma schema kept in one file for simplicity and straightforward onboarding during assessment.

## Evaluator 5-Minute Checklist

1. Start app and open Swagger at `http://localhost:8080/api/docs`.
2. Register first user and login to get JWT token.
3. Click **Authorize** and set `Bearer <token>`.
4. Create a record (`POST /api/v1/records`) and verify it appears in `GET /api/v1/records`.
5. Check dashboard aggregation from `GET /api/v1/dashboard/summary`.
