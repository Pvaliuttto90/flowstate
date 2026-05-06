# FlowState — CONTEXT.md

## What This Is
AI-native software development platform. Replaces GitHub, Jira, Jenkins,
LaunchDarkly, and Datadog with a single unified loop — from intent to production.

## Current Slice
S1 — The Core Loop
Intent → Tests → Code → Reviewed PR

## Product Principle
**Every spec is a hypothesis with a measurable outcome, not just a feature request.**

FlowState applies the Torres Opportunity Solution Tree (OST) and Lean Startup hypothesis frameworks to all work. Each spec captures:
- **Outcome** — the measurable business or user result we're trying to achieve
- **Opportunity** — the user need or problem being addressed
- **Solution** — the specific feature or change being built
- **Hypothesis** — the causal link between solution and outcome (optional, AI-assistable)
- **Success metric** — how we'll know the hypothesis held (optional, AI-assistable)
- **Result** — what actually happened after shipping (filled post-deployment)

This framing prevents teams from shipping features without clear rationale. Claude uses outcome + opportunity + solution together to generate more meaningful acceptance criteria and test scenarios.

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
S1 backend complete as of 2026-05-06. All four loop steps are live:

**Routes**
- `POST /intent` — Clerk-protected. Accepts `{ solution, outcome, opportunity, hypothesis, successMetric, code? }`. Validates solution is non-empty. Inserts spec row, calls `generateSpec(outcome, opportunity, solution)` via Anthropic, returns merged `{ ...spec, acceptanceCriteria, suggestedTests }` (201).
- `POST /tests/generate` — Clerk-protected. Loads spec, calls `generateTests(suggestedTests)`, persists as `generatedTests`, returns `{ specId, testStubs }` (200).
- `POST /code/generate` — Clerk-protected. Loads spec, calls `generateCode(solution, acceptanceCriteria, generatedTests)`, persists as `generatedCode`, returns `{ specId, code }` (200).
- `POST /pr/summarize` — Clerk-protected. Loads spec, calls `generatePR(solution, acceptanceCriteria, generatedTests, generatedCode)`, persists as `prSummary`, returns `{ specId, prSummary: { title, body } }` (200).

**AI modules** (`server/`)
- `ai.js` — `generateSpec(outcome, opportunity, solution)` → `{ acceptanceCriteria: string[], suggestedTests: string[] }`. Prompt applies Torres OST + Lean Startup framing.
- `generate-tests.js` — `generateTests(suggestedTests[])` → Vitest file string (plain text, no fences)
- `generate-code.js` — `generateCode(solution, acceptanceCriteria, testStubs)` → implementation code string
- `generate-pr.js` — `generatePR(solution, acceptanceCriteria, testStubs, code)` → `{ title, body }` JSON

**DB modules** (`server/`)
- `intent.js` — `createSpec({ solution, outcome, opportunity, hypothesis, successMetric }, { userId })` — INSERT
- `spec.js` — `getSpec(specId)`, `saveGeneratedTests`, `saveGeneratedCode`, `savePRSummary` — SELECT/UPDATE

**Frontend**
- `src/main.jsx` — `ClerkProvider` wraps `App`
- `src/App.jsx` — `SignedOut` shows `SignInButton`; `SignedIn` shows `UserButton` + `IntentInput`
- `src/components/IntentInput.jsx` — sends `Authorization: Bearer <token>` on POST /intent, displays `spec.id` and `spec.status`

**Tests** (50 passing, Vitest, 12 files)
- All Anthropic calls mocked via `@anthropic-ai/sdk` class mock
- All DB calls mocked via Drizzle fluent chain pattern with `vi.hoisted`
- All Clerk calls mocked via `@clerk/backend` / `@clerk/clerk-react`
- Route tests mock AI modules and `spec.js` directly (not the DB chain)

**CI**
- GitHub Actions (`.github/workflows/ci.yml`) — runs on push/PR to main

**Next**
- Wire S1 loop in frontend (step through solution → tests → code → PR)
- Fix `acceptanceCriteria` / `suggestedTests` persistence: POST /intent returns them from AI but never writes them back to the DB row — subsequent steps always see `[]`
- Update `spec.status` as the loop progresses

## Schema (specs table)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `solution` | text NOT NULL | the specific feature/change being built |
| `outcome` | text | measurable result being targeted |
| `opportunity` | text | user need or problem being addressed |
| `hypothesis` | text | causal link between solution and outcome |
| `success_metric` | text | how we'll know the hypothesis held |
| `result` | text | what actually happened post-deployment |
| `type` | text | default `'text'` |
| `status` | text | default `'pending'` |
| `acceptance_criteria` | jsonb | default `[]` — returned in POST /intent response but NOT persisted after AI (known gap) |
| `suggested_tests` | jsonb | default `[]` — same, NOT persisted after AI (known gap) |
| `user_id` | text | Clerk userId from token |
| `generated_tests` | text | set by POST /tests/generate |
| `generated_code` | text | set by POST /code/generate |
| `pr_summary` | jsonb | `{ title, body }` set by POST /pr/summarize |
| `created_at` | timestamp | defaultNow() |

## Known Gap
`acceptanceCriteria` and `suggestedTests` from `generateSpec()` are returned in the POST /intent response but never written back to the DB. The columns exist but remain `[]`. Subsequent steps pass `spec.acceptanceCriteria` (always `[]`) to Claude.

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
- 2026-05-04: Any new file that creates `new Anthropic()` or `postgres()` at module load must be mocked in every test file that imports `app.js`
- 2026-05-04: Route test files mock `spec.js` and AI modules directly rather than mocking the DB chain
- 2026-05-06: Renamed `intent` → `solution`; added `outcome`, `opportunity`, `hypothesis`, `success_metric`, `result` columns. `generateSpec` now takes `(outcome, opportunity, solution)` and applies Torres OST + Lean Startup framing. Every spec is a hypothesis with a measurable outcome.
