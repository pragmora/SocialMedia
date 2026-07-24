# SocialFlow

Content workflow management for community managers. Multi-tenant SaaS: Workspaces isolate clients, content, tasks, and comments. Auth via email+password with JWT http-only cookies.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS 11 + TypeScript 5.7 + Supabase JS Client |
| Frontend | React 19 + TypeScript 6 + Vite 8 + Tailwind CSS 4 + shadcn/ui |
| Database | PostgreSQL 16 (via Supabase) |
| Auth | Passport.js + JWT in http-only cookies |
| Testing | Jest (backend) + Vitest + Testing Library (frontend) |

## Architecture

```
backend/src/
├── main.ts                     → NestJS bootstrap, CORS, global pipes/filters
├── app.module.ts               → Root module importing all feature modules
├── supabase/                   → Supabase client (global module)
├── auth/                       → Register, login, logout, JWT strategy
├── workspaces/                 → CRUD, members, invites, switch
├── clients/                    → Social account management
├── content/                    → Content items, status transitions, calendar
├── projects/                   → Project grouping for content items
├── tasks/                      → Task management with assignees
├── comments/                   → Immutable comments on content items
├── dashboard/                  → Status counts, recent items, overdue tasks
├── common/                     → Guards, decorators, interceptors, error handling
│   ├── roles.guard.ts          → Role-based access control
│   ├── workspace.guard.ts      → Workspace validation
│   └── audit.interceptor.ts    → Audit logging
└── database/migrations/        → SQL schema and RLS policies

web/src/
├── main.tsx                    → React entry point
├── App.tsx                     → Router + layout + all routes
├── i18n.ts                     → i18next (Spanish locale)
├── context/                    → Auth context (MeContext)
├── components/                 → Shared components (WorkspaceSwitcher)
├── lib/                        → apiClient, labels, utils, helpers
├── pages/                      → 11 pages (Login, Dashboard, Calendar, etc.)
└── locales/es/                 → Spanish translations
```

### Security Design

- **Authentication**: JWT in http-only cookies (`sf_token`). No localStorage tokens — reduces XSS blast radius.
- **Multi-tenancy**: Every workspace-owned query accepts `workspace_id` explicitly (never from request body). Cross-tenant access returns 404 (never 403) — entity existence is never leaked.
- **Role model**: `admin` (full control), `cm` (create/edit content/tasks/comments), `viewer` (read-only). Guard-level enforcement.
- **RLS policies**: Row Level Security on all Supabase tables with helper PostgreSQL functions for authorization checks.

### Data Flow

```
React page → apiClient (fetch, credentials:include)
→ Vite proxy (/api → localhost:8080)
→ NestJS router → JwtAuthGuard (cookie → user)
→ WorkspaceGuard (validates active workspace_id)
→ RolesGuard (enforces role gate)
→ Controller → Service (business logic)
→ SupabaseService → PostgreSQL (workspace-scoped queries)
```

## Quick Start

### Prerequisites

- Node.js 20+
- npm
- A [Supabase](https://supabase.com) project (or local PostgreSQL)
- psql client (for running migrations)

### 1. Set up Supabase

Create a Supabase project and get your URL and service role key from the Supabase dashboard.

### 2. Run database migrations

Run the SQL files in order via the Supabase SQL Editor or psql:

```bash
# Fresh start (drops everything):
psql $DATABASE_URL -f backend/src/database/migrations/000_clean_slate.sql

# Then run migrations in order:
psql $DATABASE_URL -f backend/src/database/migrations/001_init.sql
psql $DATABASE_URL -f backend/src/database/migrations/002_functions.sql
psql $DATABASE_URL -f backend/src/database/migrations/003_projects.sql
psql $DATABASE_URL -f backend/src/database/migrations/004_assignee.sql
psql $DATABASE_URL -f backend/src/database/migrations/005_rls_policies.sql
```

### 3. Configure the backend

```bash
cd backend
cp .env.example .env
# Edit .env with your Supabase credentials and a secure JWT_SECRET
```

### 4. Start the API

```bash
cd backend
npm install
npm run start:dev
```

The API starts at `http://localhost:8080` with all routes under `/api`.

### 5. Start the frontend

```bash
cd web
npm install
npm run dev
```

The frontend starts at `http://localhost:5173` and proxies `/api` requests to the backend via Vite's dev server proxy.

## API Reference

All responses use a unified JSON envelope:
- Success: `{ "data": { ... } }`
- Error: `{ "error": { "code": "...", "message": "...", "details?": ... } }`

Response codes: `200` OK, `201` Created, `204` No Content, `400` Bad Request, `401` Unauthorized, `403` Forbidden, `404` Not Found, `422` Unprocessable Entity, `500` Internal Server Error.

### Auth (public — no auth required)

| Method | Path | Body | Description |
|--------|------|------|-------------|
| `POST` | `/api/auth/register` | `{email, password, name}` | Register new user (creates personal workspace + admin membership) |
| `POST` | `/api/auth/login` | `{email, password}` | Login — sets `sf_token` http-only cookie, returns user profile |
| `POST` | `/api/auth/logout` | — | Clears auth cookie |

### Current User

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/auth/me` | Cookie | Returns authenticated user profile with active workspace & role |

### Workspaces

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| `GET` | `/api/workspaces` | Cookie | Any | List user's workspaces |
| `POST` | `/api/workspaces` | Cookie | Any | Create workspace (creator becomes admin) |
| `POST` | `/api/workspaces/switch` | Cookie | Any | Switch active workspace (re-signs JWT) — body: `{workspace_id}` |
| `GET` | `/api/workspaces/:id` | Cookie | Member | Get workspace details |
| `PUT` | `/api/workspaces/:id` | Cookie | Admin | Update workspace name |
| `DELETE` | `/api/workspaces/:id` | Cookie | Admin | Soft-delete workspace |
| `GET` | `/api/workspaces/:id/members` | Cookie | Member | List workspace members |
| `PUT` | `/api/workspaces/:id/members/:userId` | Cookie | Admin | Change member role — body: `{role}` |
| `DELETE` | `/api/workspaces/:id/members/:userId` | Cookie | Admin | Remove member (cannot remove self) |
| `POST` | `/api/workspaces/:id/invites` | Cookie | Admin | Create invite link — body: `{max_uses?, expires_in_hours?}` |

### Invites

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/invites/:token/claim` | Cookie | Claim invite — joins workspace as viewer |

### Clients (requires active workspace)

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| `GET` | `/api/clients` | Cookie | Any | List clients (scoped to active workspace) |
| `POST` | `/api/clients` | Cookie | cm, admin | Create client — body: `{name, social_handles?, notes?, active?}` |
| `GET` | `/api/clients/:id` | Cookie | Any | Get client by ID |
| `PUT` | `/api/clients/:id` | Cookie | cm, admin | Update client |
| `DELETE` | `/api/clients/:id` | Cookie | cm, admin | Delete client |

### Content Items (requires active workspace)

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| `GET` | `/api/content-items` | Cookie | Any | List content items — query: `?status=&client_id=&project_id=` |
| `POST` | `/api/content-items` | Cookie | cm, admin | Create content item (starts in `draft`) |
| `GET` | `/api/content-items/:id` | Cookie | Any | Get content item with resolved comments |
| `PUT` | `/api/content-items/:id` | Cookie | cm, admin | Update content item |
| `PATCH` | `/api/content-items/:id/status` | Cookie | cm, admin | Transition status — body: `{status}` |
| `POST` | `/api/content-items/:id/assign` | Cookie | cm, admin | Assign content item to a project member |

**Content status workflow**: `draft → review → draft|approved → published → archived` (archived is terminal)

**Supported platforms**: Instagram, Facebook, Twitter, LinkedIn, TikTok, YouTube

**Content types**: Image, Video, Carousel, Story, Reel, Text, Link

### Projects (requires active workspace)

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| `GET` | `/api/projects` | Cookie | Any | List projects (scoped to active workspace) |
| `POST` | `/api/projects` | Cookie | cm, admin | Create project — body: `{name, description?, start_date?, end_date?}` |
| `GET` | `/api/projects/:id` | Cookie | Any | Get project with content items |
| `PUT` | `/api/projects/:id` | Cookie | cm, admin | Update project |
| `DELETE` | `/api/projects/:id` | Cookie | cm, admin | Delete project |

### Tasks (requires active workspace)

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| `GET` | `/api/tasks` | Cookie | Any | List tasks (scoped to active workspace) |
| `POST` | `/api/tasks` | Cookie | cm, admin | Create task — body: `{title, description?, assignee_id?, due_date?, content_item_id?, client_id?}` |
| `GET` | `/api/tasks/:id` | Cookie | Any | Get task |
| `PUT` | `/api/tasks/:id` | Cookie | cm, admin | Update task (including `done` flag) |
| `DELETE` | `/api/tasks/:id` | Cookie | cm, admin | Delete task |

### Comments (requires active workspace)

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| `GET` | `/api/content-items/:id/comments` | Cookie | Any | List comments for a content item |
| `POST` | `/api/content-items/:id/comments` | Cookie | cm, admin | Add comment (immutable after creation) — body: `{body}` |
| `DELETE` | `/api/comments/:commentId` | Cookie | cm, admin | Delete comment (also requires author match) |

### Calendar (requires active workspace)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/calendar` | Cookie | Monthly calendar view — query: `?month=YYYY-MM&client_id=&platform=&status=` |

Response includes `items[]` and `counts_by_day` (per-day scheduled content counts):

```json
{
  "data": {
    "items": [
      { "id": "...", "title": "...", "scheduled_date": "2026-05-15", "status": "approved" }
    ],
    "counts_by_day": { "2026-05-15": 3, "2026-05-20": 1 }
  }
}
```

### Dashboard (requires active workspace)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/dashboard` | Cookie | Dashboard aggregates — status counts, 10 most recent items, overdue task count |

```json
{
  "data": {
    "status_counts": { "draft": 5, "review": 3, "approved": 2, "published": 0, "archived": 0 },
    "recent_items": [ ... ],
    "overdue_tasks": 2
  }
}
```

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | API server port |
| `NODE_ENV` | `development` | Environment: `development` or `production` |
| `SUPABASE_URL` | — | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | — | Supabase service role key (bypasses RLS) |
| `JWT_SECRET` | — | Secret for JWT signing (min 32 chars recommended) |
| `JWT_EXPIRY_HOURS` | `1000` | JWT cookie lifetime in hours |

### Frontend

The frontend requires no environment variables. API requests are proxied via Vite's dev server to `localhost:8080`.

## Development

### Backend commands

```bash
cd backend
npm run start:dev        # Start with watch mode
npm run build            # Production build
npm run start:prod       # Start production build
npm test                 # Run tests
npm run test:watch       # Run tests in watch mode
npm run test:cov         # Run tests with coverage
npm run lint             # Run ESLint
```

### Frontend commands

```bash
cd web
npm run dev              # Start dev server with HMR
npm run build            # Type-check + production build
npm run preview          # Preview production build
npm run test             # Run tests once
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage
npm run lint             # Run ESLint
```

### Project conventions

- **NestJS modules**: Each feature is a self-contained module with controller, service, and DTOs
- **Workspace scoping**: Every query scopes to the active workspace — never omitted
- **Error envelope**: All errors use `{"error":{"code","message","details?"}}` format
- **Internationalization**: Frontend UI is fully in Spanish (`locales/es/translation.json`)
- **Path alias**: `@/` resolves to `web/src/` in the frontend

### Database schema

10 tables with Row Level Security:

| Table | Purpose |
|-------|---------|
| `users` | Authentication and profile |
| `workspaces` | Multi-tenant containers (soft-delete supported) |
| `memberships` | Unique `(workspace_id, user_id)` with role enum |
| `workspace_invites` | Token-based invites with expiry and max uses |
| `clients` | Social accounts with JSONB handles |
| `projects` | Group content items with date ranges and assignees |
| `content_items` | Social media content with status workflow |
| `comments` | Immutable comments on content items |
| `tasks` | Tasks with assignees, due dates, and content/client linkage |
| `audit_logs` | Tracks INSERT/UPDATE/DELETE operations |

See `backend/src/database/migrations/` for the full schema.

## Development Phases

- [x] **Phase 0** — Repo foundation, NestJS + React skeletons, schema, config
- [x] **Phase 1** — Auth & Workspaces
- [x] **Phase 2** — Clients, Content Items & Comments
- [x] **Phase 3** — Tasks, Calendar & Dashboard
- [x] **Phase 4** — Tests & Verification
- [x] **Phase 5** — Projects

## License

Private — all rights reserved.
