# Переход к варианту A: профессиональный деплой на текущем VPS

Этот документ описывает, как перейти от ручного `ssh + git pull + build` к повторяемому и безопасному процессу деплоя на текущей инфраструктуре.

Цель этапа A:
- оставить текущую архитектуру (VPS + Nginx + Go + Vite + SQLite);
- убрать ручные ошибки;
- добавить проверяемый CI/CD, атомарный релиз и быстрый rollback.

---

## 0) Что получится в конце

После внедрения у вас будет:
- CI в GitHub Actions: `lint + test + build` для backend/frontend;
- CD на VPS после успешного merge в `main`;
- релизные папки по timestamp (`/var/www/agape/releases/<id>`);
- атомарное переключение через symlink `current`;
- автоматическая smoke-проверка после выката;
- rollback одной командой на предыдущий релиз.

---

## 1) Целевая структура на сервере

```text
/var/www/agape
  /releases
    /2026-04-07_120501_ab12cd3
      /backend/server
      /backend/.env
      /frontend/dist
      /meta/release.json
  /shared
    /backend/.env
    /backend/data/agape.db
    /frontend/.env.production
  /current -> /var/www/agape/releases/2026-04-07_120501_ab12cd3
```

Принципы:
- `releases/*` — immutable артефакты релиза;
- `shared/*` — данные и секреты, которые переживают релизы;
- `current` — активная версия.

---

## 2) Подготовка сервера (разово)

### 2.1 Создайте структуру директорий

```bash
ssh root@92.51.38.130
mkdir -p /var/www/agape/{releases,shared/backend/data,shared/frontend}
mkdir -p /var/www/agape/shared/backend
```

### 2.2 Перенесите секреты в `shared`

```bash
cp /var/www/agape/backend/.env /var/www/agape/shared/backend/.env
cp /var/www/agape/frontend/.env.production /var/www/agape/shared/frontend/.env.production
chmod 600 /var/www/agape/shared/backend/.env
chmod 600 /var/www/agape/shared/frontend/.env.production
```

### 2.3 Перенесите SQLite в `shared`

```bash
systemctl stop agape-backend
cp /var/www/agape/backend/data/agape.db /var/www/agape/shared/backend/data/agape.db
systemctl start agape-backend
```

После миграции убедитесь, что `DATABASE_URL` в `shared/backend/.env` указывает на:
- `/var/www/agape/shared/backend/data/agape.db`

---

## 3) Подготовка systemd под symlink `current`

Откройте `/etc/systemd/system/agape-backend.service` и задайте:

```ini
[Unit]
Description=AGAPE Go backend
After=network.target

[Service]
Type=simple
WorkingDirectory=/var/www/agape/current/backend
EnvironmentFile=/var/www/agape/current/backend/.env
ExecStart=/var/www/agape/current/backend/server
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Примените:

```bash
systemctl daemon-reload
systemctl restart agape-backend
systemctl status agape-backend
```

---

## 4) Подготовка Nginx под `current`

В конфиге сайта (`/etc/nginx/sites-available/agape`) для статики укажите:
- `root /var/www/agape/current/frontend/dist;`

Проверьте:

```bash
nginx -t && systemctl reload nginx
```

---

## 5) Добавьте deploy-скрипт на сервер

Создайте `/usr/local/bin/agape-deploy.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

RELEASE_ID="$(date +%F_%H%M%S)_${1:-manual}"
BASE="/var/www/agape"
RELEASE_DIR="$BASE/releases/$RELEASE_ID"
REPO_DIR="$BASE/repo"

echo "[1/8] Prepare release dir: $RELEASE_DIR"
mkdir -p "$RELEASE_DIR/backend" "$RELEASE_DIR/frontend" "$RELEASE_DIR/meta"

echo "[2/8] Update source repository"
if [ ! -d "$REPO_DIR/.git" ]; then
  git clone https://github.com/gudmian/agape-studio.git "$REPO_DIR"
fi
git -C "$REPO_DIR" fetch --all --prune
git -C "$REPO_DIR" reset --hard origin/main
COMMIT_SHA="$(git -C "$REPO_DIR" rev-parse --short HEAD)"

echo "[3/8] Build backend"
export PATH="$PATH:/usr/local/go/bin"
cd "$REPO_DIR/backend"
CGO_ENABLED=0 go build -ldflags="-w -s" -o "$RELEASE_DIR/backend/server" ./cmd/server

echo "[4/8] Build frontend"
cd "$REPO_DIR/frontend"
cp "$BASE/shared/frontend/.env.production" ./.env.production
npm ci
npm run build
cp -R dist "$RELEASE_DIR/frontend/dist"

echo "[5/8] Link shared env and data"
ln -s "$BASE/shared/backend/.env" "$RELEASE_DIR/backend/.env"
mkdir -p "$RELEASE_DIR/backend/data"
ln -s "$BASE/shared/backend/data/agape.db" "$RELEASE_DIR/backend/data/agape.db"

echo "[6/8] Save release metadata"
cat > "$RELEASE_DIR/meta/release.json" <<EOF
{"release_id":"$RELEASE_ID","commit":"$COMMIT_SHA","created_at":"$(date -Iseconds)"}
EOF

PREVIOUS_TARGET="$(readlink -f "$BASE/current" || true)"
echo "$PREVIOUS_TARGET" > "$RELEASE_DIR/meta/previous_target.txt"

echo "[7/8] Switch current symlink"
ln -sfn "$RELEASE_DIR" "$BASE/current"

echo "[8/8] Restart and smoke check"
systemctl restart agape-backend
curl -fsS http://127.0.0.1:8080/health >/dev/null
curl -fsS https://agapedesign.ru/health >/dev/null

echo "Deploy success: $RELEASE_ID ($COMMIT_SHA)"
```

Сделайте исполняемым:

```bash
chmod +x /usr/local/bin/agape-deploy.sh
```

---

## 6) Скрипт rollback (разово)

Создайте `/usr/local/bin/agape-rollback.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

BASE="/var/www/agape"
CURRENT="$(readlink -f "$BASE/current")"
PREV_FILE="$CURRENT/meta/previous_target.txt"

if [ ! -f "$PREV_FILE" ]; then
  echo "No previous target metadata found"
  exit 1
fi

PREV_TARGET="$(cat "$PREV_FILE")"
if [ -z "$PREV_TARGET" ] || [ ! -d "$PREV_TARGET" ]; then
  echo "Previous target is invalid: $PREV_TARGET"
  exit 1
fi

ln -sfn "$PREV_TARGET" "$BASE/current"
systemctl restart agape-backend
curl -fsS https://agapedesign.ru/health >/dev/null
echo "Rollback success -> $PREV_TARGET"
```

```bash
chmod +x /usr/local/bin/agape-rollback.sh
```

---

## 7) CI/CD через GitHub Actions

Создайте workflow `.github/workflows/deploy-vps.yml`:

Этапы:
1. `backend-ci`: `go test ./...`, `go vet ./...`.
2. `frontend-ci`: `npm ci`, `npm run build`.
3. `deploy` (только `main`): SSH на VPS и запуск `/usr/local/bin/agape-deploy.sh $GITHUB_SHA`.

Нужные GitHub Secrets:
- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`

Важно:
- закрывайте deploy job с `environment: production`;
- включите branch protection для `main` (merge только после зеленого CI).

---

## 8) Smoke-check и release checklist

После каждого деплоя:
- `curl https://agapedesign.ru/health` -> `200`;
- отправка тестовой формы `/api/contact`;
- проверка, что фронт отдает актуальную сборку;
- проверка логов:
  - `journalctl -u agape-backend -n 100 --no-pager`.

Перед деплоем:
- есть свежий backup SQLite;
- CI зеленый;
- есть план rollback.

---

## 9) Бэкапы на этапе A

Минимум:
- ежедневный backup SQLite;
- ротация 7/14/30 дней;
- хотя бы один off-server backup (S3/облако).

Пример cron (ежедневно 02:30):

```bash
30 2 * * * /usr/bin/sqlite3 /var/www/agape/shared/backend/data/agape.db ".backup '/root/backups/agape-$(date +\%F).db'"
```

Периодически проверяйте восстановление на тестовой копии.

---

## 10) Критерии завершения этапа A

Этап A завершен, если:
- деплой запускается без ручной сборки;
- релизы переключаются через symlink;
- rollback отрабатывает за 1-2 минуты;
- все изменения в `main` проходят CI перед продом;
- есть регулярный backup и проверка восстановления.

Если все пункты выполнены — переходите к этапу B (миграция БД на Postgres).
