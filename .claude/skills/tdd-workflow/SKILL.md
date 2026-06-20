---
name: tdd-workflow
description: Write tests before implementation using TDD (Red-Green-Refactor). Use when creating new features, components, hooks, Go handlers, services, or any code change. Canonical TDD reference for fintu-tracking.
---

# TDD Workflow

Every new feature or code change follows **Red-Green-Refactor**:

1. **RED** — Write a failing test that defines the expected behavior
2. **GREEN** — Write the minimum code to make it pass
3. **REFACTOR** — Clean up while keeping tests green

## Testing Philosophy

### When to Write Tests
- **New features**: Write tests as part of RED phase before implementation
- **Bug fixes**: Write a test that reproduces the bug first
- **Refactoring existing code**: If you break an existing component/function, fix or update its tests

### When NOT to Write Tests
- **Touching a file you didn't change logic in**
- **Existing working code** — only add/update tests when you actively modify that code
- **Tests for tests** — don't test third-party libraries or generated code

## When to Apply

- New React component, hook, or utility function
- New or modified Zod schema
- New Go handler or service function
- Bug fix (write a test that reproduces the bug first)

## Workflow

### Step 1: RED — Write the Failing Test

1. **Decide what to test** — behavior, not implementation details
2. **Create the test file** colocated with the source:
   - Frontend: `*.test.tsx` / `*.test.ts` next to the source under `frontend/`
   - Backend: `*_test.go` in the same package under `backend/internal/`
3. **Run ONLY your test** — confirm it fails for the right reason

### Step 2: GREEN — Minimum Implementation

Write **only** the code needed to make the test pass. Re-run the scoped test.

### Step 3: REFACTOR — Clean Up

Improve naming, extract logic, add types. Re-run scoped test, then full suite at quality gate.

### Step 4: Edge Case Discovery

After the happy path, ask "what could go wrong?" and add tests for edge cases.

#### React Component Edge Cases
- Empty/missing props, long content, rapid clicks, conditional rendering branches, a11y

#### Go Handler Edge Cases
- Missing/malformed body, 404 not found, 401 unauthorized (no/expired JWT), empty results (`[]` not error)

#### Go Domain Logic Edge Cases
- Division by zero, boundary values, empty collections

## What to Test

| Code Type | What to Test | Pattern |
|-----------|-------------|---------|
| Zod schema | Valid parses, invalid rejects | Schema test |
| React component | Renders, interactions, conditional UI | Vitest + Testing Library |
| Utility function | Input → output, edge cases | Unit test |
| Go handler | HTTP status, response body, errors | Handler test (table-driven) |
| Go service | Business rules, calculations | Table-driven test |

## What NOT to Test

- Implementation details (private state)
- Third-party libraries (shadcn/ui, Fiber, pgx)
- Trivial wrappers with no logic

## Running Tests

Testing follows a **two-phase** approach: targeted tests during TDD, full suite before commit.

### Phase 1: Targeted Tests (during TDD)

```bash
# Frontend — single file or test name
cd frontend && pnpm vitest run path/to/file.test.ts -t "test name"

# Frontend — watch mode
cd frontend && pnpm test:watch path/to/file.test.ts

# Backend — single test by name
cd backend && go test ./internal/handlers -run TestFunctionName -v
cd backend && go test ./internal/services -run TestFunctionName -v
```

### Phase 2: Full Suite (before commit)

```bash
# Frontend — full suite
cd frontend && pnpm test

# Backend — with race detector
cd backend && go test -race ./...
```

## Quality Gate (Before Commit)

```bash
# Frontend
cd frontend && pnpm lint && pnpm exec tsc --noEmit && pnpm test

# Backend
cd backend && go vet ./... && go test -race ./...
```

**Important**: The full suite is ONLY run at the end (Quality Gate), never during individual RED/GREEN cycles.

**Note**: No Playwright/e2e or Testcontainers integration tests in this repo yet.
