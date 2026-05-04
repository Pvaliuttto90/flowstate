# FlowState — Handoff (2026-05-03)

## What Was Built Today

### Backend
- **`server/intent.js`** — `createSpec(intent)` is the core domain function. Validates that intent is non-empty, returns `{ id (UUID), intent, status: 'pending', createdAt }`. Throws `'Intent must not be empty'` on bad input.
- **`server/app.js`** — Hono app, separated from the server entrypoint so it can be imported in tests without binding a port. `POST /intent` accepts `{ intent, code? }`, calls `createSpec`, returns 201 with spec or 400 with error.
- **`server/logger.js`** — `log({ level, ...fields })` writes one JSON line to stdout with `timestamp` prepended. No dependencies. All routes call this on both success and error paths.
- **`server/index.js`** — thin entrypoint, imports app and calls `serve()` on port 3001.

### Frontend
- **`src/components/IntentInput.jsx`** — controlled input + submit button. On submit: POSTs `{ intent }` to `/intent`, displays `spec.id` and `spec.status` from the response. Not yet wired into `App.jsx`.

### Tests (12 passing)
| File | What it tests |
|---|---|
| `src/tests/intent.test.js` | `createSpec` — valid and empty intent |
| `src/tests/IntentInput.test.jsx` | Component render, POST shape, spec display |
| `server/tests/intent.route.test.js` | Route success, empty intent, missing intent |
| `server/tests/logging.test.js` | Log shape on success/error, code truncation at 200 chars |

### CI
GitHub Actions (`.github/workflows/ci.yml`) runs on every push and PR to main: installs root deps, installs `server/` deps, runs `npm test`.

---

## Key Decisions

**`server/app.js` vs `server/index.js` split** — Hono's `serve()` binds a port on import. Separating the app definition from the entrypoint lets tests import the app directly using `app.request()`, no port needed.

**Vitest `globals: true`** — React Testing Library's auto-cleanup hooks into `afterEach` globally. Without this, rendered components leaked between tests.

**Code as optional intent field** — `POST /intent` accepts an optional `code` field for pasted output from tools like v0 or Stitch. It's logged (truncated to 200 chars) but not yet stored or acted on — that's a future spec step.

**No external logger** — `server/logger.js` is 5 lines. Avoided pino/winston for now; the interface (`log({ level, ...fields })`) is compatible with a drop-in replacement later.

---

## What's Next (S1 remaining)

1. **Wire `IntentInput` into `App.jsx`** — it exists but isn't rendered anywhere yet.
2. **Persist specs to Postgres** — set up Drizzle ORM, `intents` and `specs` tables, write spec on `POST /intent`.
3. **Test generation step** — given a spec, call Anthropic API to generate test stubs. New endpoint: `POST /tests/generate`.
4. **Clerk auth** — protect all `/api/*` routes with JWT middleware.
5. **Code generation step** — given spec + approved tests, generate implementation via Anthropic API.
6. **PR summary step** — bundle spec + tests + code into a reviewed PR object.

The S1 loop is: Intent → Tests → Code → Reviewed PR. Steps 1 and part of 2 are done. Steps 3–6 are the remaining S1 work.

---

## Repo State

- Branch: `main`, all work committed and pushed
- Tests: 4 files, 12 tests, all passing
- CI: green on last push (`3204b0e`)
- No environment variables configured yet (needed for Anthropic API key, Clerk keys, DB URL)
