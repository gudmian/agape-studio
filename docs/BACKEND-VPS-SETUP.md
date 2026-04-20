# Бэкенд на VPS: пошагово с контролем на каждом этапе

Инструкция только для **Go API + SQLite + systemd** на сервере. Полный стек (Nginx, фронт, SSL) — в [VPS-SETUP.md](./VPS-SETUP.md).

Ниже пути как в вашем продакшене: код **`/var/www/agape`**, SSH **`root@92.51.38.130`**, домен для CORS **`https://agapedesign.ru`**. Если у вас другие пути — подставьте свои везде одинаково.

---

## Этап 0. Что должно быть до старта

- VPS с Ubuntu, доступ по SSH.
- Репозиторий уже клонирован в `/var/www/agape` **или** вы готовы клонировать на этом этапе (шаг 3).
- Порт **8080** на `127.0.0.1` свободен (внешне порт открывать не обязательно, если API идёт только через Nginx).

**Контроль:**

```bash
ssh root@92.51.38.130 "uname -a && test -d /var/www/agape && echo OK: каталог агape есть || echo НЕТ: сначала клонирование (шаг 3)"
```

---

## Этап 1. Установить Go (если ещё нет)

```bash
ssh root@92.51.38.130
```

```bash
export PATH=$PATH:/usr/local/go/bin
go version
```

Если команда не найдена — установите Go **не ниже версии из `backend/go.mod`** (сейчас 1.25+):

```bash
cd /tmp
wget https://go.dev/dl/go1.25.0.linux-amd64.tar.gz
rm -rf /usr/local/go && tar -C /usr/local -xzf go1.25.0.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
export PATH=$PATH:/usr/local/go/bin
```

**Контроль:**

```bash
go version
# Ожидается строка вида: go version go1.25.x linux/amd64
```

На ARM скачайте другой архив с [go.dev/dl](https://go.dev/dl/).

---

## Этап 2. Убедиться, что код бэкенда на месте

Если репозитория ещё нет:

```bash
mkdir -p /var/www/agape && cd /var/www/agape
git clone https://github.com/gudmian/agape-studio.git .
```

Если уже есть — обновите:

```bash
cd /var/www/agape && git pull
```

**Контроль:**

```bash
test -f /var/www/agape/backend/go.mod && test -f /var/www/agape/backend/cmd/server/main.go && echo OK || echo ОШИБКА: нет backend
```

---

## Этап 3. Файл окружения `backend/.env`

```bash
cd /var/www/agape/backend
cp -n .env.example .env   # -n: не перезаписать существующий
nano .env
```

Минимум для продакшена:

```env
PORT=8080
ENV=production
DATABASE_URL=/var/www/agape/backend/data/agape.db
CORS_ORIGINS=https://agapedesign.ru
```

Опционально (позже): `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `LEADS_ADMIN_TOKEN` — см. [TELEGRAM-BOT-SETUP.md](./TELEGRAM-BOT-SETUP.md) и [BACKEND.md](./BACKEND.md).

**Контроль:**

```bash
cd /var/www/agape/backend
grep -E '^PORT=|^ENV=|^DATABASE_URL=|^CORS_ORIGINS=' .env
# Все четыре строки должны быть непустые; CORS без слэша в конце: https://agapedesign.ru
chmod 600 .env
```

---

## Этап 4. Каталог данных и сборка бинаря

```bash
mkdir -p /var/www/agape/backend/data
cd /var/www/agape/backend
export PATH=$PATH:/usr/local/go/bin
CGO_ENABLED=0 go build -ldflags="-w -s" -o server ./cmd/server
```

**Контроль:**

```bash
test -x /var/www/agape/backend/server && ls -la /var/www/agape/backend/server
# Должен быть исполняемый файл server
```

---

## Этап 5. Ручной запуск и проверка API (без systemd)

**Перед `./server` порт `8080` должен быть свободен.** Если вы уже включали **этап 6** (systemd) или на сервере остался старый экземпляр, при ручном запуске будет ошибка:

`listen tcp :8080: bind: address already in use`

**Что сделать:**

1. Посмотреть, кто слушает порт:

```bash
ss -tlnp | grep ':8080'
# или: lsof -i :8080
```

2. Если это **`agape-backend`** — на время проверки этапа 5 остановите сервис, затем запускайте бинарь вручную:

```bash
systemctl stop agape-backend
```

После успешных проверок из этого этапа остановите ручной процесс (**Ctrl+C**) и снова включите автозапуск: `systemctl start agape-backend`.

3. **Альтернатива:** если systemd-сервис уже **active** и вы хотите только убедиться, что API живой — ручной `./server` **не нужен**: сразу выполните `curl` из блока ниже во **второй** сессии; контроль тот же. Ручной запуск имеет смысл, когда сервис ещё не настраивали и нужно проверить бинарь до создания юнита.

---

В одной SSH-сессии (порт 8080 свободен):

```bash
cd /var/www/agape/backend
set -a && source .env && set +a
./server
```

Должна появиться строка лога о старте сервера на порту 8080 **без** строки `ERROR` про `bind`.

В **второй** SSH-сессии:

```bash
curl -s http://127.0.0.1:8080/health
```

**Контроль:** в ответе JSON с `"success":true` и `"status":"ok"`.

Проверка заявки:

```bash
curl -s -w "\nHTTP:%{http_code}\n" -X POST http://127.0.0.1:8080/api/contact \
  -H 'Content-Type: application/json' \
  -d '{"name":"Проверка VPS","email":"vps-test@example.com","phone":"","message":"Этап 5"}'
```

**Контроль:** код **HTTP 201**, в JSON есть `"id"` у сохранённой записи.

Проверка БД:

```bash
sqlite3 /var/www/agape/backend/data/agape.db \
  "SELECT id, name, email FROM contact_requests ORDER BY id DESC LIMIT 1;"
```

Остановите ручной процесс в первой сессии: **Ctrl+C**.

Если что-то из контроля не прошло — смотрите вывод `./server` и исправьте `.env` или путь к `DATABASE_URL`.

---

## Этап 6. systemd: автозапуск

Создайте юнит:

```bash
nano /etc/systemd/system/agape-backend.service
```

Содержимое:

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

Применение:

```bash
systemctl daemon-reload
systemctl enable agape-backend
systemctl start agape-backend
```

**Контроль:**

```bash
systemctl is-active agape-backend
# Должно вывести: active

curl -s http://127.0.0.1:8080/health | head -c 200
# Снова success + ok

journalctl -u agape-backend -n 20 --no-pager
# Нет повторяющихся ошибок запуска
```

При ошибке:

```bash
systemctl status agape-backend -l
journalctl -u agape-backend -xe --no-pager
```

---

## Этап 7. Проверка через Nginx (если уже настроен)

Имеет смысл только после того, как в конфиге сайта есть `location /api/` → `127.0.0.1:8080` (см. [VPS-SETUP.md](./VPS-SETUP.md)).

**Контроль с сервера:**

```bash
curl -s https://agapedesign.ru/health
```

**Контроль заявки снаружи:**

```bash
curl -s -w "\nHTTP:%{http_code}\n" -X POST https://agapedesign.ru/api/contact \
  -H 'Content-Type: application/json' \
  -d '{"name":"Проверка HTTPS","email":"https-test@example.com","phone":"","message":"Этап 7"}'
```

Ожидается **201**. Если **502** — бэкенд не слушает или Nginx смотрит не на тот порт; если **CORS** в браузере — проверьте точное совпадение `CORS_ORIGINS` с адресом сайта и перезапустите: `systemctl restart agape-backend`.

---

## Этап 8. Опционально — лиды и Telegram

| Задача | Документ |
|--------|----------|
| Уведомления в Telegram | [TELEGRAM-BOT-SETUP.md](./TELEGRAM-BOT-SETUP.md) |
| Список заявок, смена статуса | Задайте `LEADS_ADMIN_TOKEN` в `.env`, перезапуск `agape-backend`, затем `GET /api/leads` с заголовком `Authorization: Bearer …` — см. [BACKEND.md](./BACKEND.md) |

**Контроль лидов:**

```bash
# подставьте токен из LEADS_ADMIN_TOKEN
curl -s -o /dev/null -w "HTTP:%{http_code}\n" \
  -H "Authorization: Bearer ВАШ_ТОКЕН" \
  https://agapedesign.ru/api/leads?limit=5
# Ожидается 200; если 503 — токен не задан; если 401 — неверный Bearer
```

---

## Обновление бэкенда после `git pull`

```bash
cd /var/www/agape && git pull
cd backend
export PATH=$PATH:/usr/local/go/bin
CGO_ENABLED=0 go build -ldflags="-w -s" -o server ./cmd/server
systemctl restart agape-backend
```

**Контроль:**

```bash
systemctl is-active agape-backend && curl -s http://127.0.0.1:8080/health
```

---

См. также: [BACKEND.md](./BACKEND.md) (API), [VPS-SETUP.md](./VPS-SETUP.md) (полный деплой).
