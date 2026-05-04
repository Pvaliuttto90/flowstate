# FlowState — Handoff (2026-05-04)

## What Was Built This Session

### POST /tests/generate — Tests Phase of S1

Given a `specId`, loads `suggestedTests` from Postgres, sends them to Claude to expand into Vitest test stubs, persists the result, and returns it. This closes the Tests phase of the S1 Core Loop.

#### New source files

- **`server/generate-tests.js`** — `generateTests(suggestedTests: string[])` calls `claude-sonnet-4-6` with a numbered list of test scenarios. System prompt instructs Claude to return a plain Vitest file (no markdown fences), one `it()` stub per scenario with `expect.fail('not implemented')`. Returns the raw string.

- **`server/spec.js`** — Two DB helpers:
  - `getSpec(specId)` — `db.select().from(specs).where(eq(specs.id, specId))`, returns row or `null`
  - `saveGeneratedTests(specId, stubs)` — `db.update(specs).set({ generatedTests: stubs }).where(eq(specs.id, specId)).returning()`, returns updated row

#### Changed files

- **`server/app.js`** — `POST /tests/generate` route added (Clerk-protected, same Bearer token pattern as `/intent`):
  - 401: missing/invalid token
  - 400: `specId` missing from body
  - 404: spec not found in DB
  - 400: `spec.suggestedTests` is empty array
  - On success: calls `generateTests` → `saveGeneratedTests` → logs → returns `{ specId, testStubs }` (200)
  - AI/DB errors return 500

- **`server/db/schema.js`** — added `generatedTests: text('generated_tests')` (nullable, no default)

#### Migration

No drizzle-kit. Column added directly:
```bash
docker exec flowstate-db psql -U postgres -d flowstate -c "ALTER TABLE specs ADD COLUMN IF NOT EXISTS generated_tests text;"
```

#### Tests (29 passing — 11 new)

| File | Tests |
|---|---|
| `server/tests/generate-tests.test.js` | returns string with `it(`, includes all scenarios in Claude request |
| `server/tests/spec.test.js` | getSpec returns row / null; saveGeneratedTests returns updated row |
| `server/tests/tests-generate.route.test.js` | 200 valid, 401×2, 400 missing specId, 404 not found, 400 empty tests |

Also updated `intent.route.test.js` and `logging.test.js` — both needed two new mocks because `app.js` now imports `generate-tests.js` (Anthropic client at module load) and `spec.js`.

---

## Critical Mock Patterns

### Drizzle INSERT chain (intent.route.test.js, logging.test.js)
```js
const mockDbValues = vi.hoisted(() => vi.fn())
const mockDbInsert = vi.hoisted(() => vi.fn())

vi.mock('../db/index.js', () => ({
  db: { insert: mockDbInsert },
  specs: {},
}))

// in beforeEach:
mockDbInsert.mockReturnValue({ values: mockDbValues })
mockDbValues.mockImplementation((vals) => ({
  returning: () => Promise.resolve([{
    id: 'test-uuid', type: 'text', status: 'pending',
    acceptanceCriteria: [], suggestedTests: [], userId: null,
    createdAt: new Date('2026-05-04'), ...vals,
  }]),
}))
```

### Drizzle SELECT chain (spec.test.js)
```js
const mockDbSelect = vi.hoisted(() => vi.fn())
const mockDbFrom = vi.hoisted(() => vi.fn())
const mockDbWhere = vi.hoisted(() => vi.fn())

vi.mock('../db/index.js', () => ({
  db: { select: mockDbSelect, update: mockDbUpdate },
  specs: {},
}))

// in beforeEach:
mockDbSelect.mockReturnValue({ from: mockDbFrom })
mockDbFrom.mockReturnValue({ where: mockDbWhere })
mockDbWhere.mockResolvedValue([{ ...row }])  // or [] for not-found
```

### Drizzle UPDATE chain (spec.test.js)
```js
const mockDbUpdate = vi.hoisted(() => vi.fn())
const mockDbUpdateSet = vi.hoisted(() => vi.fn())
const mockDbUpdateWhere = vi.hoisted(() => vi.fn())
const mockDbUpdateReturning = vi.hoisted(() => vi.fn())

// in beforeEach:
mockDbUpdate.mockReturnValue({ set: mockDbUpdateSet })
mockDbUpdateSet.mockReturnValue({ where: mockDbUpdateWhere })
mockDbUpdateWhere.mockReturnValue({ returning: mockDbUpdateReturning })
mockDbUpdateReturning.mockResolvedValue([{ ...updatedRow }])
```

### Clerk backend mock (all files importing app.js)
```js
const mockVerifyToken = vi.hoisted(() => vi.fn())

vi.mock('@clerk/backend', () => ({
  createClerkClient: () => ({ verifyToken: mockVerifyToken }),
}))

// in beforeEach:
mockVerifyToken.mockResolvedValue({ sub: 'user_test' })
```

### Any new test file that imports app.js needs ALL of these mocks
```js
vi.mock('../db/index.js', () => ({ db: { insert: vi.fn() }, specs: {} }))
vi.mock('../ai.js', () => ({ generateSpec: vi.fn() }))
vi.mock('../generate-tests.js', () => ({ generateTests: vi.fn() }))
vi.mock('../spec.js', () => ({ getSpec: vi.fn(), saveGeneratedTests: vi.fn() }))
vi.mock('@clerk/backend', () => ({ createClerkClient: () => ({ verifyToken: mockVerifyToken }) }))
```
`app.js` instantiates `Anthropic` (via `generate-tests.js`) and `postgres` (via `db/index.js`) at module load — without these mocks the test blows up in CI with "browser-like environment" or DB connection errors.

### Clerk React mock (frontend tests)
```js
const mockGetToken = vi.hoisted(() => vi.fn())

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken: mockGetToken }),
}))

// in beforeEach:
mockGetToken.mockResolvedValue('test-token')
```

---

## Environment Variables

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | `server/.env` | `postgresql://postgres:postgres@localhost:5432/flowstate` |
| `CLERK_SECRET_KEY` | `server/.env` | Backend token verification |
| `VITE_CLERK_PUBLISHABLE_KEY` | `.env` (root) | Frontend ClerkProvider |

Neither `.env` file is committed. CI doesn't need them — all external calls are mocked.

Docker container: `flowstate-db` (postgres image).

---

## Lessons Learned This Session

**1. Any new file that creates an Anthropic client or Postgres client at module load must be mocked in every test file that imports `app.js`.**
`app.js` imports grow as routes are added. Each new route's service file may have module-level side effects (Anthropic SDK throws in jsdom; postgres tries to connect). The complete mock list at the bottom of the "Critical Mock Patterns" section above must be kept current as new service files are added.

**2. Drizzle SELECT and UPDATE chains need separate hoisted mocks for each step.**
Unlike INSERT (which returns a plain object with `.returning()` as a non-mock function), SELECT and UPDATE chains need every step to be a `vi.hoisted` fn so you can vary return values per test (e.g., return `[]` for the 404 case). See the chain patterns above.

**3. Skip drizzle-kit for column additions — use `docker exec psql ALTER TABLE IF NOT EXISTS` directly.**
Faster and avoids generating a migration file for a simple nullable column add.

---

## What's Next (S1 remaining)

1. **Code generation step** — `POST /code/generate`: accepts `specId`, loads `generatedTests` from the spec, calls Claude to generate implementation that would make those tests pass, persists and returns the result.
2. **PR summary step** — `POST /pr/summarize`: bundles spec + tests + code into a reviewed PR description object.

---

## Repo State

- Branch: `main`, all work committed (`74adf7c`)
- Tests: 8 files, 29 tests, all passing
- CI: should be green (no new packages installed)
- Local DB: `flowstate-db` container, `specs` table has `generated_tests` column
