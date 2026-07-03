---
name: plan
description: Create an approved execution plan from a spec. Use when starting a new feature or the user says /plan.
disable-model-invocation: true
---

# /plan — Spec to Approved Plan

Transform a spec file into a structured, human-approved plan file ready for `/execute`.
This skill does **NOT** trigger any implementation agents.

**Plan output location:** `.cursor/plans/<spec-name>.plan.md` — **never** write to `~/.claude/plans`.

## Input

A spec file path, e.g.: `/plan .cursor/specs/add-trade-export.md`

Specs live under `.cursor/specs/` — create the folder and spec if needed.

If no path is given, ask the user before proceeding.

## Steps

### Step 1 — Read and validate the spec

Read the spec file. Verify it contains:
- Goal
- Background
- Scope (with repos and change types)
- Out of Scope
- Prerequisites
- Acceptance Criteria

If any required section is missing, list what's missing and amend the spec.
Do not proceed until the spec is complete.

### Step 2 — Verify prerequisites

For each prerequisite, launch one **Explore** subagent (built-in) to confirm it in the codebase.
If any prerequisite fails, report and stop.

### Step 3 — Investigate

Decompose scope into targeted questions. Launch one **Explore** subagent per question:
- Exact file paths and line references
- Interfaces, types, API contracts
- Downstream consumers of removed/refactored code
- Existing test coverage

Synthesize all findings before writing tasks.

### Step 4 — Write the plan

Produce: `.cursor/plans/<spec-name>.plan.md`

```yaml
---
spec: <path to spec file>
status: pending-approval
created: <YYYY-MM-DD>
todos:
  - id: T-01
    content: "<title>"
    agent: frontend-alchemist
    status: pending
    success_criteria:
      - "<mechanical, test-verifiable statement>"
    depends_on: []
---
```

Body sections:
- **Investigation Summary**
- **Task List** (T-01, T-02, … with Area, Agent chain, Depends on, Files, Success criteria, Rollback)
- **Execution Order** (dependency graph)
- **Open Questions**

For **new UI** with no design spec, add a task or note to run `frontend-design` before `frontend-alchemist`.

Agent chains:
- Frontend: `frontend-alchemist` → `frontend-reviewer`
- Backend: `go-implementer` → `go-reviewer`

### Step 5 — Present and wait for approval

Show the plan. Do **NOT** implement. Do **NOT** launch implementers or reviewers.

Ask: "Does this plan look correct? Reply **approved** or request changes."

On changes: update plan file and re-present.
On **approved**: set `status: approved` in frontmatter and stop.
