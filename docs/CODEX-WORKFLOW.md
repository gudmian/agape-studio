# Codex Workflow for AGAPE

This document maps AGAPE tasks to Codex skills and defines the Codex-native delegation workflow for this repository.

## Project Shape

AGAPE is a split-stack project:

- `frontend/`: React 19 + Vite + TypeScript + CSS Modules
- `backend/`: Go + chi + SQLite
- `docs/`, `docker-compose.yml`, `nginx.conf`: deployment and operations surface

Primary local sources:

- [README.md](../README.md)
- [FRONTEND.md](./FRONTEND.md)
- [BACKEND.md](./BACKEND.md)
- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)
- [DEPLOY.md](./DEPLOY.md)

## Skill Map

Use these Codex skills by task:

| Area | Use This Skill | Use It For |
|------|----------------|------------|
| Frontend UI | `$frontend-react-developer` | React components, layout, CSS Modules, accessibility, responsive behavior, Vite app changes |
| Backend API | `$go-developer` | Go handlers, repository changes, tests, debugging, module hygiene, concurrency and error handling |
| Deployment and ops | `$sre-engineer` | Docker Compose, VPS, Nginx, systemd, health checks, rollout safety, incident/debugging tasks |
| Whole-project AGAPE work | `$agape-fullstack` | Cross-cutting tasks that need AGAPE-specific conventions across frontend, backend, and deploy docs |

## Recommended Skill Selection

Pick the narrowest skill that matches the change:

- Hero, services, portfolio, content loading, or design-token work: `$frontend-react-developer`
- Contact form, leads API, SQLite, Telegram integration, or Go build/test failures: `$go-developer`
- Docker, Nginx, VPS rollout, health checks, CORS, service restart, or production debugging: `$sre-engineer`
- Tasks touching multiple layers or needing repo-specific conventions: `$agape-fullstack`

## AGAPE-Specific Rules

### Frontend

- Preserve the existing component split under `src/components/{ui,layout,sections}`.
- Prefer CSS Modules and existing tokens from `frontend/src/styles/tokens.css`.
- Treat `frontend/src/data/content.ts` and the content provider flow as the source of truth for site content unless the task is explicitly CMS-related.
- Preserve `useReveal()` animation patterns and `prefers-reduced-motion` behavior.

### Backend

- Preserve the existing `cmd/server` and `internal/{config,handler,middleware,model,repository,telegram}` layout.
- Keep chi routing and current middleware conventions.
- Treat SQLite persistence and the current `contact_requests` workflow as the default storage model unless the task explicitly changes it.
- Preserve admin-token protection for `/api/leads*` and avoid weakening operational safeguards.

### Ops

- Treat [DEPLOY.md](./DEPLOY.md) as the operational baseline.
- Keep changes low blast-radius when touching Docker, Nginx, VPS, or live service behavior.
- Prefer dry checks and render/build validation before any deployment-oriented recommendation.

## Cursor Command Translation

Translate the project's `.cursor` commands into Codex usage like this:

| Cursor Command | Codex-Native Equivalent |
|----------------|-------------------------|
| `/plan` | Analyze locally, then present or follow a step plan when the task is large or ambiguous |
| `/tdd` | Use `$go-developer` or `$frontend-react-developer`, add failing test first when practical, then implement |
| `/go-build` | Use `$go-developer`, run targeted `go build`, `go test`, and repo-supported validation |
| `/go-test` | Use `$go-developer`, write or tighten tests around the changed package |
| `/go-review` | Use review mode with `$go-developer`; findings first |
| `/verify` | Run build, lint, typecheck, and targeted tests relevant to the changed surface |
| `/workflow` | Do local orchestration; if the user explicitly asks for delegation, split frontend/backend/review into subagents |

## Subagent Workflow

Codex subagents are useful here, but only when the user explicitly wants delegated or parallel agent work.

Use this split when delegation is appropriate:

| Subagent Role | Ownership |
|---------------|-----------|
| Frontend worker | `frontend/` UI, styling, content-provider integration, Vite validation |
| Backend worker | `backend/` handlers, repository, tests, Go validation |
| Ops/review worker | `docker-compose*.yml`, `nginx.conf`, `docs/DEPLOY.md`, operational review |
| Explorer | Read-only codebase discovery for cross-cutting tasks |

### Good Delegation Cases

- A task changes both `frontend/` and `backend/` with minimal overlap.
- One agent can review deployment or operational risk while another implements app changes.
- One agent can do read-only discovery while the main agent keeps the critical path moving.

### Bad Delegation Cases

- Small single-file fixes.
- Work blocked on immediate answers from the same file slice.
- Changes where multiple agents would edit the same files or the same narrow package/component.

## Default Validation

Pick the smallest meaningful checks:

### Frontend

- `cd frontend && npm run build`
- `cd frontend && npm run lint`

### Backend

- `cd backend && go test ./...`
- `cd backend && go build ./cmd/server`

### Cross-cutting

- `docker compose config`
- relevant file inspection in `docs/` and config files

State clearly when something was not verified.
