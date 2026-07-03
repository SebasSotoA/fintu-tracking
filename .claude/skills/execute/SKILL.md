---
name: execute
description: Run an approved plan file through implement → review → commit batches. Use when user says /execute or wants one-shot plan execution.
disable-model-invocation: true
---

# /execute — Run Approved Plan

Drive the orchestrator implementation loop against an **approved** plan file.
This skill does **NOT** plan, investigate, or modify scope.

**Plan location:** `.cursor/plans/*.plan.md` only — never `~/.claude/plans`.

## Input

`/execute .cursor/plans/my-feature.plan.md`

If no path given, use the most recently modified `.cursor/plans/*.plan.md` with `status: approved`.

## Pre-flight

Confirm:
- `status: approved`
- All todos have `success_criteria` and `agent` assignments

If any check fails, stop and report what's missing.

## Agent roles (hardcoded)

| Role | Agents | Commits? |
|------|--------|----------|
| Implementers | `go-implementer`, `frontend-alchemist` | **No** |
| Reviewers | `go-reviewer`, `frontend-reviewer` | **Yes** (when clean) |
| Design | `frontend-design` (new UI, no spec) | No |
| Verification | `Bash` for extra checks only | No |

## Execution loop (per batch)

1. **Identify ready batch** — todos with `status: pending` and all `depends_on` met (or `done`).

2. **Implement in parallel** — Launch implementer subagents via Agent tool:
   ```
   Plan: <plan-path>
   Task: <todo-id>
   Success criteria: [...]
   Do NOT commit. Run scoped tests only.
   ```

3. **Checkpoint** — Resolve blockers before reviewers.

4. **Review in parallel** — Launch matching reviewer:
   - `frontend-alchemist` work → `frontend-reviewer`
   - `go-implementer` work → `go-reviewer`
   ```
   Implementer summary: [...]
   Success criteria: [...]
   Fix all issues, run quality gates, commit when clean. Do NOT push.
   ```

5. **Update plan file** — Mark todo `status: done` + `completed_at` timestamp, or `failed`/`blocked` with reason.

6. **Retry** — Max 2 retries per task. Third failure → `blocked`, escalate to human.

7. **Next batch** — Repeat until all todos are done, blocked, or failed.

## Quality gates (reviewers run before commit)

```bash
# Frontend
cd frontend && pnpm lint && pnpm exec tsc --noEmit && pnpm test

# Backend
cd backend && go vet ./... && go test -race ./...
```

## Completion report

- Tasks completed successfully
- Tasks blocked (with reasons)
- Tasks failed (with reasons)
- Reminder: nothing pushed — push is manual
- Suggest: `/learn` and `make headroom-learn` to capture session learnings

## Orchestrator note

During `/execute`, skip teach-mode checkpoints unless the user requests ELI5/ELI14/ELII.
