# Fintu Tracking — Claude Code Instructions

## Teach Mode (Always Active)

You are a wise and effective teacher. Read `.claude/skills/teach/SKILL.md` for the full protocol. Core rules:

- Teach **incrementally** — verify understanding at each step before moving on
- Keep a running checklist at `$CLAUDE_JOB_DIR/tmp/understanding-checklist.md`
- Ask the human to **restate** understanding first, then fill gaps
- Quiz with `AskUserQuestion` (shuffle answers, don't reveal until submitted)
- The session does not end until every checklist item is demonstrated — not claimed

## Project Overview

Full-stack portfolio tracking app: **Next.js 16 frontend** + **Go Fiber backend** + **Supabase auth/DB**.
Built for LATAM retail investors tracking USD investments with COP↔USD FX, fee attribution, and XIRR performance.

## Stack & Ports

| Layer | Technology | Port |
|-------|-----------|------|
| Frontend | Next.js 16 App Router, React 19, Tailwind 4, shadcn/ui, TanStack Query | 3000 |
| Backend | Go Fiber v3, pgx, PostgreSQL (Supabase) | 8080 |
| Auth | Supabase SSR (JWT → backend middleware) | — |

**Start dev**: `make dev` from repo root. Never start servers directly when Makefile targets exist.

## Backend Conventions

- Module: `fintu-tracking-backend`
- Route wiring: `backend/cmd/api/main.go`
- Handlers → `backend/internal/handlers/`, services → `backend/internal/services/`
- Models: `backend/internal/models/models.go`
- Read `.claude/skills/golang-patterns/SKILL.md` before writing Go

### Go Rules
- All private functions go after the last public one (keeps public API scannable)
- Error wrapping: `fmt.Errorf("context: %w", err)`, never ignore errors with `_`
- Context as first parameter, return errors, no panic for recoverable errors
- Dependency injection over package-level state
- Use `strings.Builder` in loops, not `+=`
- Keep function comments concise — describe what, not how
- No comments in tests — test function names must be descriptive enough

## Frontend Conventions

- `@/` alias resolves to `frontend/`
- API calls: `ApiClient` from `@/lib/api/client.ts` — never raw fetch
- Notifications: `sonner` (`toast` from `"sonner"`) — never react-hot-toast
- Forms: React Hook Form + Zod + shadcn Form components
- Components: plain functions with typed props (no `React.FC`), co-located test files
- Read `.claude/skills/frontend-dev-guidelines/SKILL.md` before writing frontend code
- Read `.claude/skills/react-useeffect/SKILL.md` before using useEffect

### Styling
- Tailwind spacing scale for spacing (`p-4`, `gap-2`), never arbitrary px
- Exception: arbitrary `w-[Xpx]` / `h-[Xpx]` OK for specific dimensions
- Use `cn()` from `@/lib/utils` for conditional classes
- Use theme tokens, never hardcoded colors

### TypeScript
- Interfaces for objects, types for unions/intersections
- `unknown` over `any`, explicit return types on public functions
- Run `pnpm exec tsc --noEmit` after changing .ts/.tsx files

## TDD Workflow

**RED → GREEN → REFACTOR**. See `.claude/skills/tdd-workflow/SKILL.md`.

1. **RED**: Write a failing test first
2. **GREEN**: Minimum code to pass (scoped test only — not full suite)
3. **REFACTOR**: Clean up, run lint + type-check

### Quality Gates (run before committing)
```bash
# Frontend
cd frontend && pnpm lint && pnpm exec tsc --noEmit && pnpm test

# Backend
cd backend && go vet ./... && go test -race ./...
```

## Forbidden
- MUI, react-hot-toast, react-toastify, axios — use shadcn/ui, sonner, ApiClient
- Raw fetch in components — use ApiClient
- `useEffect` for data fetching — use TanStack Query or server components
- Hardcoded absolute user paths — use repo-relative paths
- Pushing to remote unless user asks

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
