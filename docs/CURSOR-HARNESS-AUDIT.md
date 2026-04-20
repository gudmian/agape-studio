# Cursor Harness Audit for AGAPE

This audit classifies the repository's `.cursor` skills, rules, commands, and hooks against AGAPE's actual stack: React + Vite frontend, Go + chi + SQLite backend, and VPS/Docker/Nginx deployment.

## Summary

The `.cursor` directory is a reusable harness, not product runtime code.

What is clearly active:

- Rules under `.cursor/rules/`
- Commands under `.cursor/commands/`
- Hook scripts under `.cursor/hooks/`
- Local skills under `.cursor/skills/`

What is not established from the repo alone:

- Whether every referenced external agent actually exists in `~/.claude/agents/`
- Whether every command is used regularly by the team

## High-Value Commands for AGAPE

These align well with the current stack and workflow:

| Command | Why It Fits |
|---------|-------------|
| `.cursor/commands/plan.md` | Useful for larger frontend/backend/deploy tasks |
| `.cursor/commands/tdd.md` | Good generic workflow for bug-first or test-first changes |
| `.cursor/commands/go-build.md` | Directly relevant to `backend/` |
| `.cursor/commands/go-test.md` | Directly relevant to `backend/` |
| `.cursor/commands/go-review.md` | Directly relevant to `backend/` review |
| `.cursor/commands/verify.md` | General validation wrapper |
| `.cursor/commands/code-review.md` | Broadly useful for review workflow |
| `.cursor/commands/build-fix.md` | Potentially useful as a generic build triage command |
| `.cursor/commands/pm2.md` | Possibly useful if PM2 is used outside the current Go/systemd path |
| `.cursor/commands/orchestrate.md` | Useful as a concept doc for complex handoffs |
| `.cursor/commands/multi-workflow.md` | Useful as orchestration guidance, but too broad for day-to-day AGAPE work |

## Medium-Value or Situational Commands

These may help in specific scenarios but are not central to the current repo:

| Command | Notes |
|---------|-------|
| `.cursor/commands/e2e.md` | Useful if end-to-end testing is added; not obviously wired today |
| `.cursor/commands/devfleet.md` | Useful only if external worktree-based orchestration is adopted |
| `.cursor/commands/docs.md` | Potentially useful because the repo has substantial docs |
| `.cursor/commands/update-docs.md` | Useful for docs synchronization tasks |
| `.cursor/commands/quality-gate.md` | Potentially useful if formal release gates are adopted |
| `.cursor/commands/test-coverage.md` | Useful if the team starts tracking coverage explicitly |
| `.cursor/commands/context-budget.md` | Useful for harness maintenance, not product work |
| `.cursor/commands/skill-create.md` | Useful for harness evolution, not app runtime work |
| `.cursor/commands/skill-health.md` | Useful for skill maintenance, not feature delivery |

## Low-Value or Mismatched Commands

These do not match the current AGAPE stack and are mostly harness carry-over:

| Category | Examples |
|----------|----------|
| Non-project languages | `cpp-*`, `kotlin-*`, `python-review`, `rust-*` |
| Framework mismatch | `nextjs-turbopack` skill, Bun-oriented guidance for runtime choice |
| Multi-model orchestration overhead | `multi-backend`, `multi-execute`, parts of `multi-workflow` |
| Product/domain mismatch | investor, outreach, article-writing, market-research skills |

## Relevant Rules

These rules are directionally useful, but they assume a more automatic agent model than Codex uses:

| Rule | Assessment |
|------|------------|
| `.cursor/rules/common-agents.mdc` | Useful intent, but assumes proactive agent spawning |
| `.cursor/rules/common-development-workflow.mdc` | Good high-level pipeline: plan, TDD, review |
| `.cursor/rules/common-testing.mdc` | Useful testing bias |
| `.cursor/rules/golang-*` | Relevant to `backend/` |
| `.cursor/rules/typescript-*` | Relevant to `frontend/` |
| `.cursor/rules/common-security.mdc` | Useful as review guidance |

## Hooks

Observed hooks include:

- `.cursor/hooks/subagent-start.js`
- `.cursor/hooks/subagent-stop.js`

These do not implement subagents themselves. They only log lifecycle events for agent start/stop, which confirms the harness expects delegated execution in some environments.

## Recommended Cleanup Focus

If you want the harness to feel project-specific instead of generic, prioritize:

1. Keep Go, TypeScript, plan, review, verify, docs, and orchestration guidance.
2. Down-rank or remove language/framework files unrelated to AGAPE.
3. Replace generic multi-agent assumptions with an AGAPE-specific Codex workflow.
4. Point frontend work toward React + Vite + CSS Modules instead of generic frontend guidance.
5. Point ops work toward Docker Compose, Nginx, VPS, and systemd because those are present in this repo.

## Recommended Codex Replacement

Prefer the Codex-native workflow described in [CODEX-WORKFLOW.md](./CODEX-WORKFLOW.md) plus these skills:

- `$frontend-react-developer`
- `$go-developer`
- `$sre-engineer`
- `$agape-fullstack`
