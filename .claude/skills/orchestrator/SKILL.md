---
name: orchestrator
description: Orchestrator milestone loop for non-trivial work — discuss, plan, execute, verify, ship. Auto-invoked when user starts a multi-step feature.
user-invocable: false
---

# Orchestrator Background Rules

Loaded automatically for multi-step work. The main session is the orchestrator.

## Milestone loop

Discuss → Plan → Execute → Verify → Ship

## Strict delegation

- Main thread: plan, dispatch, review, verify — **no source file edits** (hooks enforce)
- Subagents: implement and review in isolated context
- User may say **override** once to edit source directly (set `$env:ORCHESTRATOR_OVERRIDE = "1"` for that turn)

## Commands

| Command | Purpose |
|---------|---------|
| `/plan <spec>` | Investigate → write `.cursor/plans/*.plan.md` → wait for approved |
| `/execute <plan>` | Batch implement → review → commit |
| `/learn` | Post-milestone self-learning |

## Commit rule

Only `frontend-reviewer` and `go-reviewer` commit. Never push unless user asks.

## Teach mode exception

During `/execute`, skip teach checkpoints unless user requests ELI5/ELI14/ELII.
