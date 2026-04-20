# Бэкенд — AGAPE

Go + Chi + SQLite. Принимает заявки с формы, отдаёт данные для CMS-интеграции.

## Стек

| Инструмент | Роль |
|------------|------|
| Go 1.22 | Язык |
| chi v5 | HTTP-роутер |
| go-chi/cors | CORS middleware |
| modernc.org/sqlite | SQLite (чистый Go) |
| log/slog | Структурированные логи |

## Запуск

```bash
cd backend

# Скопировать конфиг
cp .env.example .env

# Запустить
go run ./cmd/server/main.go
# Сервер доступен на http://localhost:8080
```

### Переменные окружения

| Переменная | По умолчанию | Описание |
|------------|--------------|----------|
| `PORT` | `8080` | Порт сервера |
| `DATABASE_URL` | `./data/agape.db` | Путь к SQLite-базе |
| `CORS_ORIGINS` | `http://localhost:5173` | Разрешённые origins (через запятую) |
| `ENV` | `development` | Окружение (`development` / `production`) |
| `TELEGRAM_BOT_TOKEN` | — | Токен бота Telegram; пусто — уведомления не отправляются |
| `TELEGRAM_CHAT_ID` | — | ID чата или пользователя для уведомлений о новых заявках |
| `LEADS_ADMIN_TOKEN` | — | **Не из Telegram.** Произвольная длинная случайная строка, которую вы сами задаёте (например `openssl rand -hex 32`). Тот же текст передаётся в заголовке `Authorization: Bearer …` при вызове `/api/leads`. Пусто — маршруты `/api/leads*` отвечают `503` |

**Пошаговая настройка Telegram** (BotFather, `chat_id`, проверки `curl`, связка с `.env`): [TELEGRAM-BOT-SETUP.md](./TELEGRAM-BOT-SETUP.md).

**Бэкенд на VPS** (Go, `.env`, сборка, systemd, проверки после каждого шага): [BACKEND-VPS-SETUP.md](./BACKEND-VPS-SETUP.md).

## API

### `GET /health`
Проверка состояния сервиса.

```json
{ "success": true, "data": { "status": "ok" } }
```

### `POST /api/contact`
Приём заявки с формы сайта.

**Тело запроса:**
```json
{
  "name": "Иван",
  "email": "ivan@example.com",
  "phone": "+7 999 000 00 00",
  "message": "Хочу обсудить проект"
}
```

**Ответ (201):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Иван",
    "email": "ivan@example.com",
    "phone": "+7 999 000 00 00",
    "message": "Хочу обсудить проект",
    "status": "new",
    "notes": "",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

После сохранения заявки, если заданы `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID`, в фоне отправляется сообщение в Telegram (сбой доставки не ломает ответ клиенту — ошибка пишется в лог). Как создать бота и проверить доставку по шагам: [TELEGRAM-BOT-SETUP.md](./TELEGRAM-BOT-SETUP.md).

**Валидация:**
- `name` — обязателен, минимум 2 символа
- `email` — обязателен, должен содержать `@`
- `message` — опционален, максимум 2000 символов

### `GET /api/projects`
Список проектов портфолио (статические данные, готово к замене на CMS).

### `GET /api/services`
Список услуг (статические данные, готово к замене на CMS).

### Заявки для работы с клиентами (`/api/leads`)

Требуется заголовок `Authorization: Bearer <LEADS_ADMIN_TOKEN>`.  
Если `LEADS_ADMIN_TOKEN` не задан в окружении, маршруты отвечают `503`.

#### `GET /api/leads`

Список заявок, новые сверху.

**Query:** `status` (опционально: `new`, `in_progress`, `done`, `archived`), `limit` (по умолчанию 50, макс. 200), `offset`.

#### `GET /api/leads/{id}`

Одна заявка.

#### `PATCH /api/leads/{id}`

Обновление статуса и/или внутренних заметок.

**Тело (хотя бы одно поле):**
```json
{
  "status": "in_progress",
  "notes": "Перезвонить во вторник"
}
```

## Rate Limiting

На все `/api/*` маршруты применён rate limiter: **10 req/s** на IP.  
При превышении — `429 Too Many Requests`.

## Структура

```
backend/
├── cmd/server/main.go       Точка входа, роутер, graceful shutdown
├── internal/
│   ├── config/config.go     Загрузка конфига из env
│   ├── handler/handler.go   HTTP-обработчики
│   ├── middleware/
│   │   ├── middleware.go    Logger, RateLimiter
│   │   └── admin.go         Bearer для /api/leads
│   ├── model/model.go       Структуры данных
│   ├── repository/db.go     SQLite CRUD
│   └── telegram/client.go   Уведомления в Telegram
├── Dockerfile               Продакшн-образ (multi-stage)
├── Dockerfile.dev           Dev-образ с Air hot-reload
└── .air.toml                Конфиг Air
```

## База данных

SQLite, файл создаётся автоматически при первом запуске.  
Схема создаётся и дополняется в `repository.New()` (к существующей таблице добавляются колонки при необходимости):

```sql
CREATE TABLE IF NOT EXISTS contact_requests (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  phone      TEXT    NOT NULL DEFAULT '',
  email      TEXT    NOT NULL,
  message    TEXT    NOT NULL DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status     TEXT    NOT NULL DEFAULT 'new',
  notes      TEXT    NOT NULL DEFAULT '',
  updated_at DATETIME
);
```

Статусы: `new`, `in_progress`, `done`, `archived`.

### Просмотр заявок

```bash
sqlite3 backend/data/agape.db "SELECT * FROM contact_requests;"
```

## Docker

```bash
# Продакшн-образ
docker build -t agape-backend ./backend

# Запуск
docker run -p 8080:8080 \
  -e ENV=production \
  -e CORS_ORIGINS=https://your-domain.com \
  -v agape_data:/app/data \
  agape-backend
```

## Расширение под CMS

Сейчас `/api/projects` и `/api/services` возвращают статические данные из `handler.go`.  
Для подключения CMS:

1. Добавьте клиент CMS в `internal/service/cms.go`
2. Замените заглушки в хендлерах на вызовы сервиса
3. Добавьте кэш (TTL ~5 минут) чтобы не долбить CMS при каждом запросе
