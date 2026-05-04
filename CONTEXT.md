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
S1 backend complete as of 2026-05-04. All four loop steps are live:

**Routes**
- `POST /intent` — Clerk-protected. Validates intent, inserts spec row via Drizzle, calls `generateSpec(intent)` via Anthropic, returns merged `{ ...spec, acceptanceCriteria, suggestedTests }` (201)
- `POST /tests/generate` — Clerk-protected. Loads spec by id, calls `generateTests(suggestedTests)` via Anthropic, persists result as `generatedTests`, returns `{ specId, testStubs }` (200)
- `POST /code/generate` — Clerk-protected. Loads spec, calls `generateCode(intent, acceptanceCriteria, generatedTests)` via Anthropic, persists as `generatedCode`, returns `{ specId, code }` (200)
- `POST /pr/summarize` — Clerk-protected. Loads spec, calls `generatePR(intent, acceptanceCriteria, generatedTests, generatedCode)` via Anthropic, persists as `prSummary` jsonb, returns `{ specId, prSummary: { title, body } }` (200)

**AI modules** (`server/`)
- `ai.js` — `generateSpec(intent)` → `{ acceptanceCriteria: string[], suggestedTests: string[] }`
- `generate-tests.js` — `generateTests(suggestedTests[])` → Vitest file string (plain text, no fences)
- `generate-code.js` — `generateCode(intent, acceptanceCriteria, testStubs)` → implementation code string
- `generate-pr.js` — `generatePR(intent, acceptanceCriteria, testStubs, code)` → `{ title, body }` JSON

**DB modules** (`server/`)
- `intent.js` — `createSpec(intent, { userId })` — INSERT
- `spec.js` — `getSpec(specId)`, `saveGeneratedTests`, `saveGeneratedCode`, `savePRSummary` — SELECT/UPDATE
- `db/schema.js` — `specs` table: id, intent, type, status, acceptanceCriteria, suggestedTests, userId, generatedTests, generated_code, pr_summary, createdAt
- `db/index.js` — Drizzle client via postgres-js, reads `DATABASE_URL`

**Frontend**
- `src/main.jsx` — `ClerkProvider` wraps `App`
- `src/App.jsx` — `SignedOut` shows `SignInButton`; `SignedIn` shows `UserButton` + `IntentInput`
- `src/components/IntentInput.jsx` — sends `Authorization: Bearer <token>` on POST /intent, displays `spec.id` and `spec.status`

**Tests** (50 passing, Vitest, 12 files)
- All Anthropic calls mocked via `@anthropic-ai/sdk` class mock
- All DB calls mocked via Drizzle fluent chain pattern with `vi.hoisted`
- All Clerk calls mocked via `@clerk/backend` / `@clerk/clerk-react`
- Route test files mock AI modules and `spec.js` directly (not the DB chain)

**CI**
- GitHub Actions (`.github/workflows/ci.yml`) — runs on push/PR to main

**Next**
- Wire S1 loop in frontend (step through intent → tests → code → PR, displaying each result)
- Fix `acceptanceCriteria` / `suggestedTests` persistence: POST /intent returns them from AI but never writes them back to the DB row — subsequent steps always see `[]`
- Update `spec.status` as the loop progresses

## Known Gap
`acceptanceCriteria` and `suggestedTests` from `generateSpec()` are spread into the POST /intent response but not persisted. The `specs` table has these columns (jsonb, default `[]`) but they remain empty. `/code/generate` and `/pr/summarize` pass `spec.acceptanceCriteria` to Claude but it will always be `[]` until this is fixed.

## Integrations Philosophy
FlowState accepts pasted code from AI design tools as a first-class intent type. Supported sources include Stitch (Google), v0 (Vercel), and similar tools. No direct integration needed — users paste generated code as a code intent.

## Decisions Log
- 2026-05-03: Scaffolded React + Vite frontend and Hono backend
- 2026-05-03: Split `server/app.js` from `server/index.js` so Hono app is importable in tests without binding a port
- 2026-05-03: Vitest configured with jsdom + globals: true (required for React Testing Library auto-cleanup)
- 2026-05-03: Code intents are a first-class type — `code` field is optional on POST /intent, logged truncated to 200 chars
- 2026-05-04: Drizzle ORM + postgres-js for Postgres persistence; `specs` table schema defined
- 2026-05-04: Drizzle fluent chain mock pattern with `vi.hoisted` — required because `db.insert().values().returning()` is a chained call
- 2026-05-04: Anthropic API integrated at POST /intent — `generateSpec` returns `acceptanceCriteria` and `suggestedTests` merged into spec response
- 2026-05-04: Clerk auth added — `createClerkClient` called at module load in `app.js`; mocked via `vi.mock('@clerk/backend', ...)` in all server test files that import `app.js`
- 2026-05-04: Always commit `package.json` + `package-lock.json` immediately when installing new packages — CI has no other way to know about them
- 2026-05-04: Schema migrations done via `docker exec flowstate-db psql ALTER TABLE IF NOT EXISTS` — faster than drizzle-kit for simple nullable column adds
- 2026-05-04: Any new file that creates `new Anthropic()` or `postgres()` at module load must be mocked in every test file that imports `app.js` — both blow up in jsdom (browser-env error / no DB connection)
- 2026-05-04: Route test files mock `spec.js` and AI modules directly rather than mocking the DB chain — cleaner isolation; only `spec.test.js` tests the Drizzle chains
