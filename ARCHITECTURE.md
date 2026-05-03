# FlowState S1 — Architecture

## The Core Loop

```
Intent → Tests → Code → Reviewed PR
```

## System Diagram

```mermaid
flowchart TD
    User(["User"])

    subgraph Frontend["Frontend — Vite :5173"]
        UI["Intent Input\n(feature / bug / goal)"]
        TestView["Test Preview"]
        CodeView["Code Review UI"]
        PRView["PR Summary"]
    end

    subgraph Backend["Backend — Hono :3001"]
        IntentHandler["/api/intent"]
        TestGen["/api/tests/generate"]
        CodeGen["/api/code/generate"]
        PRHandler["/api/pr/create"]
        AuditLog["Audit Logger"]
    end

    subgraph Data["Data — Postgres + Drizzle"]
        Intents[("intents")]
        Specs[("specs")]
        Runs[("runs")]
        AuditTrail[("audit_trail")]
    end

    Claude["Anthropic API\nclaude-sonnet-4-20250514"]
    Clerk["Clerk Auth"]

    User -->|"authenticate"| Clerk
    Clerk -->|"JWT"| Frontend

    User --> UI
    UI -->|"POST /api/intent"| IntentHandler
    IntentHandler --> Specs
    IntentHandler -->|"generate tests"| TestGen
    TestGen -->|"prompt"| Claude
    Claude -->|"test stubs"| TestGen
    TestGen --> TestView
    TestView -->|"approved"| CodeGen
    CodeGen -->|"prompt + tests"| Claude
    Claude -->|"implementation"| CodeGen
    CodeGen --> CodeView
    CodeView -->|"approved"| PRHandler
    PRHandler --> PRView

    IntentHandler --> AuditLog
    TestGen --> AuditLog
    CodeGen --> AuditLog
    PRHandler --> AuditLog
    AuditLog --> AuditTrail

    IntentHandler --> Intents
    CodeGen --> Runs
```

## Data Flow Narrative

1. **Intent** — User describes what they want. Stored in `intents`, converted to a spec.
2. **Tests** — Backend prompts Claude with the spec. Generated test stubs shown to user for approval before any code is written.
3. **Code** — Backend prompts Claude with spec + approved tests. Implementation shown to user for review.
4. **Reviewed PR** — Approved code bundled into a PR summary with full audit trail attached.

Every AI call writes to `audit_trail` before the result is surfaced — no AI action is invisible.

## Auth Boundary

All `/api/*` routes require a valid Clerk JWT. The frontend attaches the token; the backend validates it before any handler runs.

## Port Reference

| Service        | Port |
|----------------|------|
| Frontend (Vite)| 5173 |
| Backend (Hono) | 3001 |
| Postgres       | 5432 |
