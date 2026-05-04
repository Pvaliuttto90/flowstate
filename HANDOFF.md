# FlowState — Handoff (2026-05-04)

## What Was Built This Session

### Anthropic API Integration
- **`server/ai.js`** — `generateSpec(intent)` calls `claude-sonnet-4-6` with a system prompt asking for a JSON object `{ acceptanceCriteria: string[], suggestedTests: string[] }`. Result is spread into the POST /intent response alongside the DB row.

### Postgres + Drizzle Persistence
- **`server/db/schema.js`** — `specs` table: `id` (UUID PK), `intent` (text), `type` (text, default 'text'), `status` (text, default 'pending'), `acceptanceCriteria` (jsonb), `suggestedTests` (jsonb), `userId` (text), `createdAt` (timestamp)
- **`server/db/index.js`** — Drizzle client via `postgres-js`, reads `DATABASE_URL` from env, exports `db` and `specs`
- **`server/drizzle.config.js`** + migrations in `server/drizzle/` — committed and applied to local Postgres
- **`server/intent.js`** — `createSpec(intent, { userId } = {})` now async; inserts into DB and returns the saved row

### Clerk Auth
- **`server/app.js`** — Clerk middleware at top of `POST /intent`: extracts `Authorization: Bearer <token>`, calls `clerkClient.verifyToken(token)`, returns 401 on missing or invalid token. `userId` from `payload.sub` is passed to `createSpec`.
- **`src/main.jsx`** — `ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}` wraps `App`
- **`src/App.jsx`** — `SignedOut` renders `SignInButton`; `SignedIn` renders `UserButton` + `IntentInput`
- **`src/components/IntentInput.jsx`** — `const { getToken } = useAuth()`, fetches token before submit, sends `Authorization: Bearer <token>` header

### Tests (18 passing)
All DB calls mocked with Drizzle fluent chain pattern. All Clerk calls mocked.

| File | Tests |
|---|---|
| `server/tests/intent.route.test.js` | 201 valid, 400 empty, 400 missing, AI fields, **401 no token**, **401 bad token** |
| `server/tests/logging.test.js` | success log, error log, code truncation, short code, error+code |
| `server/tests/ai.test.js` | returns arrays, includes intent in Claude request |
| `src/tests/IntentInput.test.jsx` | renders, POSTs **with Authorization header** |

---

## Critical Mock Patterns

### Drizzle chain mock (all files that import `app.js` or `intent.js`)
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
The `...vals` spread is essential — it makes the returned row echo back the `intent` that was inserted, so route tests can assert `body.intent`.

### Clerk backend mock (all files that import `app.js`)
```js
const mockVerifyToken = vi.hoisted(() => vi.fn())

vi.mock('@clerk/backend', () => ({
  createClerkClient: () => ({ verifyToken: mockVerifyToken }),
}))

// in beforeEach:
mockVerifyToken.mockResolvedValue({ sub: 'user_test' })
```
`createClerkClient` is called at module load in `app.js`, so the mock must be hoisted before the import.

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

---

## Lessons Learned This Session

**1. Always commit package files in the same commit as the code that uses them.**
When installing a new npm package, `package.json` + `package-lock.json` (root and/or server) must be committed alongside the code. CI installs strictly from `package.json` — if a package isn't listed there, CI fails with module-not-found even though tests pass locally. This bit us twice: once with Drizzle, once with `@clerk/clerk-react` and `@clerk/backend`.

**2. Any new test file that imports `app.js` or `intent.js` needs both the `@clerk/backend` mock and the `db/index.js` mock using `vi.hoisted`.**
`app.js` calls `createClerkClient(...)` at module load time, and `intent.js` calls `db.insert(...)` at call time. Without both mocks hoisted before the import, the real Clerk client and the real Postgres connection attempt to initialize, blowing up in CI (no secrets, no DB). See the mock patterns section above for the exact boilerplate.

---

## What's Next (S1 remaining)

1. **Test generation step** — `POST /tests/generate`: accepts `specId`, looks up the spec's `suggestedTests`, calls Anthropic API to expand them into runnable Vitest test stubs, persists and returns the result. This is the "Tests" phase of the S1 Core Loop.
2. **Code generation step** — given spec + approved tests, generate implementation via Anthropic API.
3. **PR summary step** — bundle spec + tests + code into a reviewed PR object.

---

## Repo State

- Branch: `main`, all work committed and pushed
- Tests: 5 files, 18 tests, all passing
- CI: green on last push (`6525645`)
- Local DB: Postgres running, `flowstate` database exists, `specs` table migrated
