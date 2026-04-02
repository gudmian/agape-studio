# Деплой — AGAPE

## Текущая конфигурация (production)

| Компонент | Сервис | Детали |
|-----------|--------|--------|
| **Сервер** | Timeweb Cloud VPS | Ubuntu 24.04, 1 CPU, 1GB RAM, IP: `92.51.38.130` |
| **Домен** | agapedesign.ru | DNS: A-запись → `92.51.38.130` |
| **SSL** | Let's Encrypt | Автопродление через certbot, истекает 2026-07-01 |
| **Бэкенд** | systemd `agape-backend` | Go-бинарь, порт 8080, автозапуск |
| **Фронтенд** | Nginx | Статика из `/var/www/agape/frontend/dist/` |
| **База данных** | SQLite | `/var/www/agape/backend/data/agape.db` |

**Сайт:** https://agapedesign.ru

---

## Обновление сайта (после изменений в коде)

```bash
# Подключиться к серверу
ssh root@92.51.38.130

# Обновить код
cd /var/www/agape && git pull

# Пересобрать бэкенд (если менялся Go-код)
export PATH=$PATH:/usr/local/go/bin
cd backend && CGO_ENABLED=0 go build -ldflags="-w -s" -o server ./cmd/server
systemctl restart agape-backend

# Пересобрать фронтенд (если менялся React-код)
cd /var/www/agape/frontend && npm run build
# Nginx подхватит автоматически — перезапуск не нужен
```

---

Два варианта: **VPS + Nginx** (текущий) или **Vercel + Railway** (облако).

---

## Вариант A: Vercel (фронтенд) + Railway (бэкенд) — рекомендован

### 1. Деплой бэкенда на Railway

1. Зарегистрируйтесь на [railway.app](https://railway.app)
2. Создайте новый проект → Deploy from GitHub repo
3. Укажите Root Directory: `backend`
4. Railway автоматически обнаружит `Dockerfile`
5. Добавьте переменные окружения:

```
PORT=8080
ENV=production
DATABASE_URL=/app/data/agape.db
CORS_ORIGINS=https://your-vercel-app.vercel.app
```

6. Добавьте Volume: `/app/data` (для SQLite)
7. Скопируйте Railway URL вида `https://xxx.railway.app`

### 2. Деплой фронтенда на Vercel

1. Зарегистрируйтесь на [vercel.com](https://vercel.com)
2. Import Git Repository → выберите репозиторий
3. Root Directory: `frontend`
4. Framework Preset: Vite (определяется автоматически)
5. Откройте `frontend/vercel.json` и замените URL бэкенда:

```json
"destination": "https://xxx.railway.app/api/:path*"
```

6. Deploy — Vercel соберёт фронтенд и настроит реврайты на API

### 3. Обновить CORS

После получения Vercel-домена обновите переменную на Railway:
```
CORS_ORIGINS=https://your-project.vercel.app
```

---

## Вариант B: VPS + Nginx + Docker

### Требования к серверу

- Ubuntu 22.04 LTS
- 1 CPU, 1 GB RAM (минимум)
- Docker + Docker Compose установлены
- Домен настроен на IP сервера

### 1. Подготовка сервера

```bash
# Установить Docker
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER

# Установить Nginx + Certbot
apt install -y nginx certbot python3-certbot-nginx
```

### 2. Клонировать репозиторий

```bash
git clone https://github.com/your/agape.git /var/www/agape
cd /var/www/agape
```

### 3. Настроить переменные

```bash
cp .env.example .env
nano .env
# CORS_ORIGINS=https://your-domain.com
```

### 4. Запустить бэкенд через Docker

```bash
docker compose up --build -d
# Бэкенд доступен на localhost:8080
```

### 5. Собрать фронтенд

```bash
cd frontend
npm install
npm run build
# Статика в frontend/dist/
```

### 6. Настроить Nginx

```bash
# Скопировать конфиг
cp nginx.conf /etc/nginx/sites-available/agape
# Заменить your-domain.com на реальный домен
nano /etc/nginx/sites-available/agape

ln -s /etc/nginx/sites-available/agape /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### 7. SSL через Certbot

```bash
certbot --nginx -d your-domain.com -d www.your-domain.com
```

### 8. Обновление (CI/CD)

```bash
cd /var/www/agape
git pull

# Обновить бэкенд
docker compose up --build -d

# Обновить фронтенд
cd frontend && npm run build
```

---

## Обновление фронтенда без перезапуска

Фронтенд — статика. Для обновления достаточно:

```bash
cd frontend
npm run build
# Nginx сразу начнёт отдавать новую версию
```

---

## Мониторинг бэкенда

```bash
# Логи контейнера
docker compose logs -f backend

# Health check
curl http://localhost:8080/health

# Заявки в БД
docker compose exec backend sqlite3 /app/data/agape.db \
  "SELECT id, name, email, created_at FROM contact_requests ORDER BY id DESC LIMIT 10;"
```

---

## Переменные окружения

| Переменная | Описание | Пример |
|------------|----------|--------|
| `CORS_ORIGINS` | Разрешённые origins фронтенда | `https://agape.vercel.app` |
| `PORT` | Порт бэкенда | `8080` |
| `DATABASE_URL` | Путь к SQLite-файлу | `/app/data/agape.db` |
| `ENV` | Окружение | `production` |
