# FlowState — CONTEXT.md

## What This Is
AI-native software development platform. Replaces GitHub, Jira, Jenkins, 
LaunchDarkly, and Datadog with a single unified loop — from intent to production.

## Current Slice
S1 — The Core Loop
Intent → Tests → Code → Reviewed PR

## Stack
- Frontend: React + Vite (port 5173)
- Backend: Node.js + Hono (port 3001)
- Database: Postgres + Drizzle ORM
- AI: Anthropic API (claude-sonnet-4-6)
- Auth: Clerk
- Deployment: VPS + PM2

## Engineering Principles
1. Tests before implementation — always
2. Every AI action is auditable
3. No feature ships without a spec
4. All API actions log structured JSON with full input/output context

## Current Work
S1 in progress. Complete as of 2026-05-04:

**Backend**
- `server/intent.js` — `createSpec(intent, { userId })` validates intent, inserts into Postgres via Drizzle, returns saved row
- `server/ai.js` — `generateSpec(intent)` calls Anthropic API (claude-sonnet-4-6), returns `{ acceptanceCriteria: string[], suggestedTests: string[] }`
- `server/app.js` — Hono app. `POST /intent` is Clerk-protected: extracts Bearer token, calls `clerkClient.verifyToken()`, returns 401 on missing/invalid token; on success calls `createSpec(intent, { userId })` + `generateSpec(intent)`, returns merged spec (201) or error (400)
- `server/logger.js` — `log()` writes structured JSON to stdout with `timestamp`, `level`, and any passed fields
- `server/db/schema.js` — Drizzle schema: `specs` table (id UUID, intent, type, status, acceptanceCriteria jsonb, suggestedTests jsonb, userId, createdAt)
- `server/db/index.js` — Drizzle client via postgres-js, reads `DATABASE_URL` from env
- `server/drizzle.config.js` + migrations in `server/drizzle/`
- `server/index.js` — imports app, calls `serve()` on port 3001

**Frontend**
- `src/main.jsx` — `ClerkProvider` wraps `App` with `VITE_CLERK_PUBLISHABLE_KEY`
- `src/App.jsx` — `SignedOut` shows `SignInButton`; `SignedIn` shows `UserButton` + `IntentInput`
- `src/components/IntentInput.jsx` — calls `useAuth().getToken()`, sends `Authorization: Bearer <token>` on POST, displays returned `spec.id` and `spec.status`

**Tests** (18 passing, Vitest)
- `src/tests/IntentInput.test.jsx` — RTL: renders, POSTs with Authorization header (mocks `@clerk/clerk-react`)
- `src/tests/setup.js` — imports `@testing-library/jest-dom`
- `server/tests/intent.route.test.js` — route: 201 with valid token, 400 bad intent, 401 missing token, 401 invalid token, AI fields in response (mocks `@clerk/backend` + Drizzle chain)
- `server/tests/logging.test.js` — logging: success/error shape, code truncation (mocks `@clerk/backend` + Drizzle chain)
- `server/tests/ai.test.js` — unit: `generateSpec` returns arrays, includes intent in Claude request (mocks `@anthropic-ai/sdk`)

**CI**
- GitHub Actions (`.github/workflows/ci.yml`) — runs on push/PR to main, installs root + server deps, runs `npm test`

**Next**
- Implement test generation step (Tests phase of S1 loop): `POST /tests/generate` — accepts `specId`, calls Anthropic API with `suggestedTests` from the spec, returns runnable test stubs

## Integrations Philosophy
FlowState accepts pasted code from AI design tools as a first-class intent type. Supported sources include Stitch (Google), v0 (Vercel), and similar tools. No direct integration needed — users paste generated code as a code intent.

## Decisions Log
- 2026-05-03: Scaffolded React + Vite frontend and Hono backend
- 2026-05-03: Server running on 3001, frontend on 5173
- 2026-05-03: Split `server/app.js` from `server/index.js` so Hono app is importable in tests without binding a port
- 2026-05-03: Vitest configured with jsdom + globals: true (required for React Testing Library auto-cleanup)
- 2026-05-03: Code intents are a first-class type — `code` field is optional on POST /intent, logged truncated to 200 chars
- 2026-05-03: `.claude/` added to `.gitignore`, `settings.local.json` untracked
- 2026-05-04: Drizzle ORM + postgres-js for Postgres persistence; `specs` table schema defined
- 2026-05-04: Drizzle fluent chain mock pattern with `vi.hoisted` — required because `db.insert().values().returning()` is a chained call; `mockDbValues.mockImplementation((vals) => ({ returning: () => Promise.resolve([{...defaults, ...vals}]) }))` spreads vals so intent echoes back in response
- 2026-05-04: Anthropic API integrated at POST /intent — `generateSpec` returns `acceptanceCriteria` and `suggestedTests` merged into spec response
- 2026-05-04: Clerk auth added — `createClerkClient` called at module load in `app.js`; mocked via `vi.mock('@clerk/backend', () => ({ createClerkClient: () => ({ verifyToken: mockVerifyToken }) }))` in all server test files that import `app.js`
- 2026-05-04: Always commit `package.json` + `package-lock.json` (root and server) immediately when installing new packages — CI has no other way to know about them
