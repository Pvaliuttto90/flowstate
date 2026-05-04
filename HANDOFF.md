# FlowState — Handoff (2026-05-04)

## S1 Core Loop — COMPLETE

All four backend steps are wired and tested:

```
POST /intent          → spec row created; AI returns acceptanceCriteria + suggestedTests
POST /tests/generate  → Vitest test stubs generated from suggestedTests; persisted as generatedTests
POST /code/generate   → implementation code generated from intent + criteria + tests; persisted as generatedCode
POST /pr/summarize    → { title, body } PR description generated from full spec; persisted as prSummary
```

All routes: Clerk-protected (Bearer token), 400/404 guards, structured JSON logging, 500 on AI failure.

---

## What Was Built This Session

### POST /pr/summarize

- **`server/generate-pr.js`** — `generatePR(intent, acceptanceCriteria, testStubs, code)` calls `claude-sonnet-4-6`. System prompt instructs Claude to return `{ "title": string, "body": string }` JSON — no other text. Body has `## Summary`, `## Changes`, `## Test plan` sections.

- **`server/spec.js`** — `savePRSummary(specId, prSummary)` added — same Drizzle UPDATE pattern as previous saves.

- **`server/app.js`** — `POST /pr/summarize` route:
  - 401: missing/invalid token
  - 400: `specId` missing
  - 404: spec not found
  - 400: `spec.generatedCode` is null (code phase not yet run)
  - On success: `generatePR` → `savePRSummary` → log → return `{ specId, prSummary }` (200)

- **`server/db/schema.js`** — added `prSummary: jsonb('pr_summary')` (nullable)

Migration: `docker exec flowstate-db psql -U postgres -d flowstate -c "ALTER TABLE specs ADD COLUMN IF NOT EXISTS pr_summary jsonb;"`

### POST /code/generate (previous step, same session)

- **`server/generate-code.js`** — `generateCode(intent, acceptanceCriteria, testStubs)` → plain code string (no fences). Formats a structured user message: intent + numbered criteria + test stubs.

- **`server/spec.js`** — `saveGeneratedCode(specId, code)` — Drizzle UPDATE.

- **`server/db/schema.js`** — `generatedCode: text('generated_code')` (nullable).

Migration: `docker exec flowstate-db psql -U postgres -d flowstate -c "ALTER TABLE specs ADD COLUMN IF NOT EXISTS generated_code text;"`

---

## Full Schema (specs table)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `intent` | text | user's feature intent |
| `type` | text | default `'text'` |
| `status` | text | default `'pending'` |
| `acceptance_criteria` | jsonb | default `[]` — set at insert but NOT updated after AI; always `[]` in DB |
| `suggested_tests` | jsonb | default `[]` — same, NOT persisted after AI |
| `user_id` | text | Clerk userId from token |
| `generated_tests` | text | set by POST /tests/generate |
| `generated_code` | text | set by POST /code/generate |
| `pr_summary` | jsonb | `{ title, body }` set by POST /pr/summarize |
| `created_at` | timestamp | defaultNow() |

**Important:** `acceptanceCriteria` and `suggestedTests` from the AI are returned in the POST /intent response but never written back to the DB — they stay as `[]`. When `/code/generate` calls `generateCode(spec.intent, spec.acceptanceCriteria, ...)`, `spec.acceptanceCriteria` is always `[]`. This is a known gap — fixing it would mean updating the spec row after the AI call in POST /intent.

---

## Source File Map

| File | Exports | Purpose |
|---|---|---|
| `server/intent.js` | `createSpec` | INSERT new spec row |
| `server/ai.js` | `generateSpec` | Anthropic → `{ acceptanceCriteria, suggestedTests }` |
| `server/generate-tests.js` | `generateTests` | Anthropic → Vitest file string |
| `server/generate-code.js` | `generateCode` | Anthropic → implementation code string |
| `server/generate-pr.js` | `generatePR` | Anthropic → `{ title, body }` JSON |
| `server/spec.js` | `getSpec`, `saveGeneratedTests`, `saveGeneratedCode`, `savePRSummary` | DB SELECT/UPDATE |
| `server/app.js` | default Hono app | all 4 routes + auth |
| `server/logger.js` | `log` | structured JSON to stdout |
| `server/db/schema.js` | `specs` | Drizzle table definition |
| `server/db/index.js` | `db`, `specs` | Drizzle client via postgres-js |

---

## Critical Mock Patterns

### Rule: any new test file that imports app.js needs ALL of these mocks

```js
const mockVerifyToken = vi.hoisted(() => vi.fn())

vi.mock('@clerk/backend', () => ({
  createClerkClient: () => ({ verifyToken: mockVerifyToken }),
}))
vi.mock('../db/index.js', () => ({ db: { insert: vi.fn() }, specs: {} }))
vi.mock('../ai.js', () => ({ generateSpec: vi.fn() }))
vi.mock('../generate-tests.js', () => ({ generateTests: vi.fn() }))
vi.mock('../generate-code.js', () => ({ generateCode: vi.fn() }))
vi.mock('../generate-pr.js', () => ({ generatePR: vi.fn() }))
vi.mock('../spec.js', () => ({
  getSpec: vi.fn(),
  saveGeneratedTests: vi.fn(),
  saveGeneratedCode: vi.fn(),
  savePRSummary: vi.fn(),
}))
```

`app.js` creates an `Anthropic()` instance (×3, via generate-*.js) and a `postgres()` connection (via db/index.js) at module load. Without all these mocks, tests blow up with "browser-like environment" or DB connection errors in CI.

### Drizzle chain mocks

**INSERT** (`intent.route.test.js`, `logging.test.js`):
```js
mockDbInsert.mockReturnValue({ values: mockDbValues })
mockDbValues.mockImplementation((vals) => ({
  returning: () => Promise.resolve([{ id: 'test-uuid', type: 'text', status: 'pending',
    acceptanceCriteria: [], suggestedTests: [], userId: null,
    createdAt: new Date('2026-05-04'), ...vals }]),
}))
```

**SELECT** (`spec.test.js`):
```js
mockDbSelect.mockReturnValue({ from: mockDbFrom })
mockDbFrom.mockReturnValue({ where: mockDbWhere })
mockDbWhere.mockResolvedValue([{ ...row }])  // [] for not-found → null
```

**UPDATE** (`spec.test.js`):
```js
mockDbUpdate.mockReturnValue({ set: mockDbUpdateSet })
mockDbUpdateSet.mockReturnValue({ where: mockDbUpdateWhere })
mockDbUpdateWhere.mockReturnValue({ returning: mockDbUpdateReturning })
mockDbUpdateReturning.mockResolvedValue([{ ...updatedRow }])
```

### Route test pattern (spec.js + AI module mocked directly)

```js
const mockGetSpec = vi.hoisted(() => vi.fn())
const mockSaveX = vi.hoisted(() => vi.fn())
const mockGenerateX = vi.hoisted(() => vi.fn())

vi.mock('../spec.js', () => ({ getSpec: mockGetSpec, saveX: mockSaveX, ... }))
vi.mock('../generate-x.js', () => ({ generateX: mockGenerateX }))

// in beforeEach:
mockGetSpec.mockResolvedValue(VALID_SPEC)
mockGenerateX.mockResolvedValue(RESULT)
mockSaveX.mockResolvedValue({ ...VALID_SPEC, field: RESULT })
```

---

## Test Suite

**50 tests, 12 files, all passing.**

| File | Count | Covers |
|---|---|---|
| `server/tests/intent.route.test.js` | 6 | POST /intent — 201, 400×2, 401×2, AI fields |
| `server/tests/logging.test.js` | 5 | structured log shape, code truncation |
| `server/tests/ai.test.js` | 2 | generateSpec — arrays, intent in request |
| `server/tests/generate-tests.test.js` | 2 | generateTests — string, scenarios in request |
| `server/tests/generate-code.test.js` | 4 | generateCode — string, intent/criteria/stubs in request |
| `server/tests/generate-pr.test.js` | 3 | generatePR — title+body, intent+code in request |
| `server/tests/spec.test.js` | 5 | getSpec (found/null), saveGeneratedTests, saveGeneratedCode, savePRSummary |
| `server/tests/tests-generate.route.test.js` | 6 | POST /tests/generate — 200, 401×2, 400×2, 404 |
| `server/tests/code-generate.route.test.js` | 6 | POST /code/generate — 200, 401×2, 400×2, 404 |
| `server/tests/pr-summarize.route.test.js` | 6 | POST /pr/summarize — 200, 401×2, 400×2, 404 |
| `src/tests/IntentInput.test.jsx` | 2 | renders, POSTs with Authorization header |
| `src/tests/setup.js` | 0 | setup only |

---

## Environment Variables

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | `server/.env` | `postgresql://postgres:postgres@localhost:5432/flowstate` |
| `CLERK_SECRET_KEY` | `server/.env` | Backend token verification |
| `VITE_CLERK_PUBLISHABLE_KEY` | `.env` (root) | Frontend ClerkProvider |

Docker container: `flowstate-db` (postgres image). Neither `.env` is committed; CI mocks all external calls.

---

## Repo State

- Branch: `main`, all work committed (`824c5dc`)
- Tests: 12 files, 50 tests, all passing
- CI: green (no new packages installed this session)
- Local DB: `flowstate-db` container, `specs` table has all columns through `pr_summary`

## What's Next

S1 backend is complete. Remaining work is frontend and integration:

1. **Wire the S1 loop in the frontend** — UI to step through intent → tests → code → PR, displaying each result and allowing the user to advance to the next step
2. **Persist acceptanceCriteria + suggestedTests** — POST /intent currently returns them in the response but never writes them back to the DB; fix so subsequent steps can use them
3. **Status field** — update `spec.status` as the loop progresses (`pending` → `tests-generated` → `code-generated` → `pr-ready`)
