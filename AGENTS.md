# Repository Guidelines

## Project Structure & Module Organization

AGAPE is a split-stack repository:

- `frontend/`: React 19 + Vite + TypeScript UI. Main code lives in `src/` with `components/{ui,layout,sections}`, `content/`, `data/`, `hooks/`, and `styles/`.
- `backend/`: Go API with `cmd/server` entrypoint and `internal/{config,handler,middleware,model,repository,telegram}` packages.
- `docs/`: deployment, CMS, backend, frontend, and design-system documentation.
- `scripts/`: Directus bootstrap and SQLite migration helpers.
- `deploy/`, `docker-compose*.yml`, `nginx.conf`: operational and deployment assets.

## Build, Test, and Development Commands

- `cd frontend && npm run dev`: start the Vite dev server.
- `cd frontend && npm run build`: run TypeScript build and produce `dist/`.
- `cd frontend && npm run lint`: run ESLint on frontend source.
- `cd backend && go run ./cmd/server/main.go`: run the Go API locally.
- `cd backend && go build ./cmd/server`: compile the backend server binary.
- `cd backend && go test ./...`: run backend tests when present.
- `docker compose up --build -d`: run the production-like local stack.
- `npm run directus:bootstrap`: create/populate Directus collections from repo defaults.

## Coding Style & Naming Conventions

- Frontend uses TypeScript, 2-space indentation, PascalCase for React components, and `*.module.css` for component-scoped styles.
- Keep frontend sections in `components/sections/` and shared primitives in `components/ui/`.
- Backend uses idiomatic Go formatting. Run `gofmt` on changed `.go` files. Keep package names lowercase and focused.
- Reuse existing design tokens from `frontend/src/styles/tokens.css` instead of hardcoding new values.
- User-facing communication in this repository should always be in Russian unless the user explicitly asks for another language.

## Testing Guidelines

There is no meaningful automated test suite yet. For any non-trivial change:

- run `cd frontend && npm run build && npm run lint`
- run `cd backend && go test ./... && go build ./cmd/server`

Add new tests next to the code they cover using Go’s `*_test.go` convention or frontend test files if a test runner is introduced.

## Commit & Pull Request Guidelines

Recent history uses Conventional Commit prefixes: `feat:`, `feat(frontend):`, `feat(backend):`, `fix:`, `docs:`, `chore:`.

- Keep commits scoped and imperative, for example `feat(frontend): add Directus-backed portfolio gallery`.
- PRs should include a short summary, affected areas (`frontend`, `backend`, `docs`, deploy), verification steps, and screenshots for UI changes.

## Security & Configuration Tips

- Never commit `.env` files, tokens, or production secrets.
- Treat `LEADS_ADMIN_TOKEN`, `TELEGRAM_BOT_TOKEN`, and `VITE_CMS_TOKEN` as sensitive.
- Preserve bearer protection on `/api/leads*` and validate deploy/config changes against `docs/DEPLOY.md` before merging.
