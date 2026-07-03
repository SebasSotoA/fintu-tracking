---
name: learn
description: Extract session learnings and propose updates to skills, agents, and CLAUDE.local.md after a milestone. Run after /execute completes.
disable-model-invocation: true
---

# /learn — Self-Learning Loop

Mine the current session for repeatable improvements. Run manually after `/execute` milestones or when patterns emerge.

## Steps

### 1. Gather signals

Review:
- Plan file status updates in `.cursor/plans/`
- Hook denials (orchestrator blocked edits)
- Reviewer feedback themes
- Repeated mistakes or workarounds

### 2. Run Headroom (if installed)

```bash
make headroom-learn
```

Review proposed `CLAUDE.local.md` diffs — machine-specific corrections.

### 3. Propose updates

Target files (present diffs, **never auto-commit**):
- `.claude/skills/*/SKILL.md` — workflow fixes
- `.claude/agents/*.md` — agent prompt gaps
- `CLAUDE.local.md` — permissions, commands, machine quirks
- Root `CLAUDE.md` — only if project-wide convention changed

### 4. Present for approval

Show each proposed change with rationale. Wait for user approval before applying.

## Anti-patterns

- Auto-committing learnings
- Bloating CLAUDE.md with skill-level detail (keep skills/agents as source of truth)
- Writing to `~/.claude/plans` — plans stay in `.cursor/plans/`
