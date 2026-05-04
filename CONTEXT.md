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
S1 in progress. Complete as of 2026-05-03:

**Backend**
- `server/intent.js` — `createSpec(intent)` validates intent, returns `{ id, intent, status: 'pending', createdAt }`
- `server/ai.js` — `generateSpec(intent)` calls Anthropic API (claude-sonnet-4-6), returns `{ acceptanceCriteria: string[], suggestedTests: string[] }`
- `server/app.js` — Hono app (separated from server entry for testability). `POST /intent` accepts `{ intent, code? }`, calls `createSpec` + `generateSpec`, returns merged spec as JSON (201) or error (400)
- `server/logger.js` — `log()` writes structured JSON to stdout with `timestamp`, `level`, and any passed fields
- Logging on all `/intent` requests: success logs `intent`, `code` (truncated to 200 chars if present), `specId`, `status`; errors log `intent`, `code`, `error`
- `server/index.js` — imports app, calls `serve()` on port 3001

**Frontend**
- `src/components/IntentInput.jsx` — controlled text input + submit button, POSTs to `/intent`, displays returned `spec.id` and `spec.status`

**Tests** (15 passing, Vitest)
- `src/tests/intent.test.js` — unit tests for `createSpec` (valid intent, empty intent)
- `src/tests/IntentInput.test.jsx` — RTL tests for component render and POST/display flow
- `server/tests/intent.route.test.js` — route tests for success, empty intent, missing intent, AI fields in response
- `server/tests/logging.test.js` — logging tests for success, error, code truncation, short code, error with code
- `server/tests/ai.test.js` — unit tests for `generateSpec` (returns arrays, includes intent in request)

**CI**
- GitHub Actions (`.github/workflows/ci.yml`) — runs on push/PR to main, installs root + server deps, runs `npm test`

**Next**
- Wire `IntentInput` into `App.jsx` so it's visible in the browser
- Implement test generation step (Tests phase of S1 loop) — use `suggestedTests` from spec to generate runnable test stubs
- Add Postgres + Drizzle ORM; persist specs to DB
- Add Clerk auth; protect `/intent` route

## Integrations Philosophy
FlowState accepts pasted code from AI design tools as a first-class intent type. Supported sources include Stitch (Google), v0 (Vercel), and similar tools. No direct integration needed — users paste generated code as a code intent.

## Decisions Log
- 2026-05-03: Scaffolded React + Vite frontend and Hono backend
- 2026-05-03: Server running on 3001, frontend on 5173
- 2026-05-03: Split `server/app.js` from `server/index.js` so Hono app is importable in tests without binding a port
- 2026-05-03: Vitest configured with jsdom + globals: true (required for React Testing Library auto-cleanup)
- 2026-05-03: Code intents are a first-class type — `code` field is optional on POST /intent, logged truncated to 200 chars
- 2026-05-03: `.claude/` added to `.gitignore`, `settings.local.json` untracked
