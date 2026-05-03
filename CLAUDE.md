# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

FlowState is an AI-native software development platform intended to replace GitHub, Jira, Jenkins, LaunchDarkly, and Datadog with a single unified loop — from intent to production.

**Current slice:** S1 — The Core Loop: Intent → Tests → Code → Reviewed PR

## Commands

### Frontend (root)
```bash
npm run dev        # Vite dev server on port 5173
npm run build      # Production build to dist/
npm run preview    # Preview the production build
npm run lint       # ESLint check
```

### Backend (server/)
```bash
cd server && node index.js   # Start Hono API server on port 3001
```

Both servers must run simultaneously during development.

## Architecture

**Monorepo with two separate Node.js packages:**

- **Root (`/`)** — React 19 + Vite frontend. Entry point: `src/main.jsx` → `src/App.jsx`.
- **`server/`** — Hono API backend. Entry point: `server/index.js`. Currently a single placeholder route.

Both packages use ES modules (`"type": "module"`).

**Planned stack additions (not yet implemented):**
- PostgreSQL + Drizzle ORM for persistence
- Anthropic API (`claude-sonnet-4-20250514`) for AI features
- Clerk for authentication
- PM2 for VPS deployment

## Engineering Principles

1. Tests before implementation — always
2. Every AI action must be auditable
3. No feature ships without a spec
