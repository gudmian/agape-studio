# Пошаговая настройка на VPS — AGAPE (production)

Инструкция под **Timeweb Cloud**, **Ubuntu 24.04**, домен **[agapedesign.ru](https://agapedesign.ru/)** (канонический URL без `www`), код в **`/var/www/agape`**, репозиторий **[github.com/gudmian/agape-studio](https://github.com/gudmian/agape-studio)**.

Схема: **один VPS** — Nginx отдаёт статику из `frontend/dist` и проксирует `/api/*` и `/health` на Go на `127.0.0.1:8080`. Отдельный виртуальный хост Nginx для **CMS** лежит в **`/etc/nginx/sites-available/cms`** (не смешивать с сайтом).

Пример конфига сайта в репозитории: **`nginx.conf`** → копия в **`/etc/nginx/sites-available/agape`**.

Только **бэкенд** на VPS (пошагово с контролем на каждом этапе): [BACKEND-VPS-SETUP.md](./BACKEND-VPS-SETUP.md).

---

## 0. Зафиксированные параметры

| Параметр | Значение |
|----------|----------|
| Провайдер | Timeweb |
| IP VPS | `92.51.38.130` |
| SSH | `ssh root@92.51.38.130` |
| Канонический сайт | `https://agapedesign.ru` (`www` редиректится на apex — см. `nginx.conf`) |
| Репозиторий | `https://github.com/gudmian/agape-studio.git` |
| Каталог кода | `/var/www/agape` |
| Статика фронтенда | `/var/www/agape/frontend/dist` |
| Переменные Vite (CMS) на сервере | файл **`/var/www/agape/frontend/.env.production`** (в git не коммитить) |
| Бэкенд | бинарь `/var/www/agape/backend/server`, `backend/.env` |
| SQLite | `/var/www/agape/backend/data/agape.db` |
| systemd | `agape-backend.service` |
| Nginx: сайт | `/etc/nginx/sites-available/agape` → `sites-enabled/agape` |
| Nginx: CMS | `/etc/nginx/sites-available/cms` → `sites-enabled/cms` |

---

## 1. Что в итоге получится

| Компонент | Где |
|-----------|-----|
| Сайт | Nginx `agape` → `/var/www/agape/frontend/dist` |
| API | Go `127.0.0.1:8080` → снаружи `https://agapedesign.ru/api/...` |
| CMS (Directus) | отдельный server в **`cms`**; подробности — [DIRECTUS-VPS-DEPLOY.md](./DIRECTUS-VPS-DEPLOY.md) |
| Заявки | SQLite `backend/data/agape.db` |
| Telegram / лиды | `backend/.env` |

---

## 2. Предварительные условия

- DNS: **A-запись** `agapedesign.ru` → IP сервера; при использовании `www` — отдельная A/ CNAME запись (сертификат обычно выпускают на оба имени).
- **Node.js 18+** и **Go ≥ 1.25** на сервере (см. `backend/go.mod`).

---

## 3. Подключение и пакеты

```bash
ssh root@92.51.38.130
```

```bash
apt update && apt upgrade -y
apt install -y nginx git ufw sqlite3
```

### Go

```bash
cd /tmp
wget https://go.dev/dl/go1.25.0.linux-amd64.tar.gz
rm -rf /usr/local/go && tar -C /usr/local -xzf go1.25.0.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
export PATH=$PATH:/usr/local/go/bin
go version
```

На **ARM** возьмите архив с [go.dev/dl](https://go.dev/dl/).

### Certbot

```bash
apt install -y certbot python3-certbot-nginx
```

### Фаервол

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

---

## 4. Код на сервере

```bash
mkdir -p /var/www/agape
cd /var/www/agape
git clone https://github.com/gudmian/agape-studio.git .
```

Обновления: `cd /var/www/agape && git pull`.

---

## 5. Бэкенд: `backend/.env`

```bash
cd /var/www/agape/backend
cp .env.example .env
nano .env
```

Минимум для продакшена:

```env
PORT=8080
ENV=production
DATABASE_URL=/var/www/agape/backend/data/agape.db
CORS_ORIGINS=https://agapedesign.ru
```

Origin в CORS — **без** слэша в конце (`https://agapedesign.ru`, не `https://agapedesign.ru/`). Редирект `www` → apex в Nginx даёт в браузере один origin; если когда-нибудь откроете сайт **только** с `www` без редиректа — добавьте второй origin через запятую.

Опционально:

```env
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
LEADS_ADMIN_TOKEN=
```

Уведомления в Telegram: пошаговая инструкция с проверками на каждом этапе — **[TELEGRAM-BOT-SETUP.md](./TELEGRAM-BOT-SETUP.md)**.

`LEADS_ADMIN_TOKEN`: `openssl rand -hex 32`. Пусто — `/api/leads` отвечает `503`.

```bash
chmod 600 /var/www/agape/backend/.env
```

---

## 6. Сборка бэкенда и systemd

```bash
mkdir -p /var/www/agape/backend/data
cd /var/www/agape/backend
export PATH=$PATH:/usr/local/go/bin
CGO_ENABLED=0 go build -ldflags="-w -s" -o server ./cmd/server
```

Разовая проверка:

```bash
set -a && source /var/www/agape/backend/.env && set +a
./server
# другая сессия: curl -s http://127.0.0.1:8080/health
```

`/etc/systemd/system/agape-backend.service`:

```ini
[Unit]
Description=AGAPE Go backend
After=network.target

[Service]
Type=simple
WorkingDirectory=/var/www/agape/backend
EnvironmentFile=/var/www/agape/backend/.env
ExecStart=/var/www/agape/backend/server
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable agape-backend
systemctl start agape-backend
systemctl status agape-backend
```

---

## 7. Nginx: сайт (`agape`) и CMS (`cms`)

**Сайт** — только файл **`agape`**, чтобы не дублировать `server` для `agapedesign.ru`:

```bash
cp /var/www/agape/nginx.conf /etc/nginx/sites-available/agape
nginx -t
```

**CMS** — отдельный конфиг (у вас уже **`/etc/nginx/sites-available/cms`**). Не вставляйте блоки Directus в `agape`. Развёртывание и прокси к Directus: [DIRECTUS-VPS-DEPLOY.md](./DIRECTUS-VPS-DEPLOY.md).

Первый выпуск SSL (если ещё не делали), с именами для сертификата:

```bash
certbot --nginx -d agapedesign.ru -d www.agapedesign.ru
```

После этого пути к ключам в `agape` должны совпасть с тем, что выдал Certbot (часто `/etc/letsencrypt/live/agapedesign.ru/...`).

Включение:

```bash
ln -sf /etc/nginx/sites-available/agape /etc/nginx/sites-enabled/agape
# cms — по необходимости:
# ln -sf /etc/nginx/sites-available/cms /etc/nginx/sites-enabled/cms
nginx -t && systemctl reload nginx
```

---

## 8. Фронтенд (сборка на этом же VPS)

Переменные **`VITE_*`** для Directus и прод-сборки храните в **`/var/www/agape/frontend/.env.production`** на сервере (файл в `.gitignore`, в репозиторий не попадает). Структура полей — в `frontend/.env.local.example`.

```bash
cd /var/www/agape/frontend
# при необходимости: nano .env.production
npm ci
npm run build
```

Vite подхватит `.env.production` автоматически при `npm run build`.

---

## 9. Проверки

```bash
curl -s http://127.0.0.1:8080/health
curl -s https://agapedesign.ru/health
curl -sI https://www.agapedesign.ru/ | head -n 5   # ожидается 301 на agapedesign.ru
curl -s -X POST https://agapedesign.ru/api/contact \
  -H 'Content-Type: application/json' \
  -d '{"name":"Тест","email":"test@example.com","phone":"","message":"Проверка"}'
```

Лиды:

```bash
curl -s -H "Authorization: Bearer ВАШ_LEADS_ADMIN_TOKEN" \
  "https://agapedesign.ru/api/leads?limit=10"
```

---

## 10. Обновление

```bash
ssh root@92.51.38.130
cd /var/www/agape && git pull

export PATH=$PATH:/usr/local/go/bin
cd backend && CGO_ENABLED=0 go build -ldflags="-w -s" -o server ./cmd/server
systemctl restart agape-backend

cd ../frontend && npm ci && npm run build
```

---

## 11. Типичные проблемы

| Симптом | Действие |
|---------|----------|
| CORS | `CORS_ORIGINS` = ровно `https://agapedesign.ru`; после правки `.env` — `systemctl restart agape-backend`. |
| 502 на `/api/` | `systemctl status agape-backend`, `journalctl -u agape-backend -xe`. |
| Два конфига объявляют один `server_name` | Держите сайт только в `agape`, CMS — только в `cms`. |
| Сборка без CMS-данных | Проверьте наличие и содержимое `frontend/.env.production` на сервере. |

---

## 12. Бэкап SQLite

```bash
systemctl stop agape-backend
cp /var/www/agape/backend/data/agape.db /root/backups/agape-$(date +%F).db
systemctl start agape-backend
```

---

См. также: [BACKEND.md](./BACKEND.md), [BACKEND-VPS-SETUP.md](./BACKEND-VPS-SETUP.md), [TELEGRAM-BOT-SETUP.md](./TELEGRAM-BOT-SETUP.md), [DEPLOY.md](./DEPLOY.md), [DIRECTUS-VPS-DEPLOY.md](./DIRECTUS-VPS-DEPLOY.md).
