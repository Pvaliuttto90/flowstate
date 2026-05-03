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
- AI: Anthropic API (claude-sonnet-4-20250514)
- Auth: Clerk
- Deployment: VPS + PM2

## Engineering Principles
1. Tests before implementation — always
2. Every AI action is auditable
3. No feature ships without a spec

## Current Work
S1 scaffolding complete. Frontend and backend running locally.

## Decisions Log
- 2026-05-03: Scaffolded React + Vite frontend and Hono backend
- 2026-05-03: Server running on 3001, frontend on 5173

