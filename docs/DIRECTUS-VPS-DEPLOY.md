# Directus на VPS: развёртывание и проверка шагов (AGAPE)

Практический сценарий: **Directus + SQLite** на вашем сервере, **Nginx + TLS**, схема и тестовые данные из репозитория, фронтенд собирается с `VITE_CMS_*`.

Схема полей и коллекций: [CMS.md](./CMS.md).

---

## Обзор этапов

| Этап | Цель | Как проверить |
|------|------|----------------|
| 0 | DNS на поддомен CMS | `dig` / браузер |
| 1 | Node.js, инструменты | `node -v`, при необходимости `sqlite3` |
| 2 | Установка Directus, первая БД | HTTP-ответ локального порта |
| 3 | systemd + автозапуск | `systemctl status` |
| 4 | Nginx reverse proxy + HTTPS | `curl -I https://cms…` |
| 5 | Миграции БД Directus | `npx directus database migrate:latest` |
| 6 | Bootstrap схемы и данных из репозитория | `node scripts/directus-bootstrap.mjs` + curl к API |
| 7 | Статический токен и права | GET с `Authorization: Bearer` |
| 8 | (Опционально) починка FK галереи SQLite | только если сломана O2M |
| 9 | Сборка фронта с прод-URL CMS | сайт без fallback из `content.ts` |

---

## Этап 0 — DNS

1. В панели домена создайте запись **A** (или **AAAA** для IPv6): имя `cms` → **публичный IP** VPS.
2. Подождите распространения (от минут до пары часов).

**Проверка:**

```bash
dig +short cms.ВАШ-ДОМЕН.ru A
# Должен вернуться IP сервера
```

---

## Этап 1 — Подготовка сервера

- **ОС:** Linux (Ubuntu/Debian — примеры ниже).
- **Node.js:** **20 LTS** или **22** (Directus 11.x; на старых версиях возможны ошибки нативных модулей).
- **Память:** от ~1 GB RAM; SQLite не требует отдельного сервиса БД.

```bash
node -v   # v20.x или v22.x
npm -v
```

Скрипт починки галереи (`migrate-sqlite-project-gallery-fk.mjs`) вызывает **`sqlite3` CLI**. Если будете его использовать:

```bash
# Ubuntu/Debian
sudo apt-get update && sudo apt-get install -y sqlite3
sqlite3 --version
```

**Проверка:** команды завершаются без ошибки, версии выводятся.

---

## Этап 2 — Установка Directus (без Docker)

Рабочая директория (пример): `/var/www/cms`. Пользователь — отдельный Unix-аккаунт или `www-data` (предпочтительнее не root для `ExecStart`).

```bash
sudo mkdir -p /var/www/cms
sudo chown "$USER:$USER" /var/www/cms
cd /var/www/cms
npm init -y
npm install directus
npx directus init
```

В мастере `directus init`:

- Клиент БД: **SQLite**
- Файл БД: например `./data.db` или `/var/www/cms/data.db` (запомните путь для бэкапов)
- Email и пароль администратора — надёжные

**Проверка (вручную):**

```bash
cd /var/www/cms
npx directus start
```

В другом SSH-сеансе:

```bash
curl -sS -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:8055/admin/login
# Ожидается 200 (или редирект 3xx — тоже нормально)
```

Остановите процесс Directus (Ctrl+C), переходите к systemd.

---

## Этап 3 — systemd

1. Скопируйте пример и отредактируйте пути и пользователя:

```bash
# из клона репозитория AGAPE на локальной машине или после git pull на сервере:
sudo cp deploy/directus.service.example /etc/systemd/system/directus.service
sudo nano /etc/systemd/system/directus.service
```

Обязательно задайте:

- `User` / `Group` — не root, если возможно
- `WorkingDirectory` — каталог, где лежит `package.json` с `directus`
- `Environment=PUBLIC_URL=https://cms.ВАШ-ДОМЕН.ru`
- `Environment=PORT=8055` (или другой порт — тогда же в Nginx)

2. Включите сервис:

```bash
sudo systemctl daemon-reload
sudo systemctl enable directus
sudo systemctl start directus
```

**Проверка:**

```bash
sudo systemctl status directus --no-pager
journalctl -u directus -n 40 --no-pager
curl -sS -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:8055/admin/login
```

Статус **active (running)**, в логах нет повторяющихся фатальных ошибок, curl — **200** или **3xx**.

---

## Этап 4 — Nginx + HTTPS

1. Серверный блок `server_name` = ваш поддомен CMS, `proxy_pass` на `127.0.0.1:8055` (см. раздел 4C в [CMS.md](./CMS.md)).
2. Получите сертификат (Certbot или TLS от хостинга).

**Проверка:**

```bash
sudo nginx -t && sudo systemctl reload nginx
curl -sSI https://cms.ВАШ-ДОМЕН.ru/admin/login | head -n 5
```

В браузере откройте `https://cms.ВАШ-ДОМЕН.ru/admin` — форма входа Directus.

В Directus: **Settings → Project Settings** — поле **Public URL** должно совпадать с `https://cms.…` (важно для ссылок и OAuth).

---

## Этап 5 — Миграции схемы Directus

После обновления версии Directus или при ошибках вида «column … does not exist»:

```bash
cd /var/www/cms
npx directus database migrate:latest
sudo systemctl restart directus
```

**Проверка:** команда завершилась с кодом **0**, сервис снова **active**.

---

## Этап 6 — Bootstrap коллекций и данных (скрипт репозитория)

На **машине, где есть клон AGAPE** (локально или на сервере), с **остановленным** Directus bootstrap не обязателен — скрипт ходит в HTTP API; Directus должен быть **запущен**.

Переменные окружения:

| Переменная | Описание |
|------------|----------|
| `DIRECTUS_URL` | Базовый URL, например `https://cms.ВАШ-ДОМЕН.ru` или `http://127.0.0.1:8055` |
| `DIRECTUS_EMAIL` | Email администратора |
| `DIRECTUS_PASSWORD` | Пароль администратора |

**Запуск из корня репозитория:**

```bash
cd /path/to/AGAPE
export DIRECTUS_URL="https://cms.ВАШ-ДОМЕН.ru"
export DIRECTUS_EMAIL="admin@example.com"
export DIRECTUS_PASSWORD="***"
node scripts/directus-bootstrap.mjs
```

Либо через npm-скрипт (если в корне есть `package.json`):

```bash
npm run directus:bootstrap
# (предварительно задайте те же переменные в shell)
```

Скрипт создаёт/обновляет коллекции (`projects`, `project_gallery`, `services`, `process_steps`, `site_content`), связи и заливает данные из того же набора, что и статический `content.ts`.

**Проверка после bootstrap:**

```bash
# войдите в админку и откройте коллекции, либо:
curl -sS -u 'EMAIL:PASSWORD' "$DIRECTUS_URL/items/projects?limit=1" | head -c 400
# Для Directus 10+ чаще используют токен (см. этап 7), не basic-auth
```

Надёжнее с **статическим токеном** (после этапа 7):

```bash
export TOKEN="…"
# Флаг -g (--globoff): иначе curl воспринимает [ ] в query как шаблон и даёт «bad range in URL»
curl -gsS -H "Authorization: Bearer $TOKEN" \
  "$DIRECTUS_URL/items/projects?filter[status][_eq]=published&limit=1"
```

Ожидается JSON с полем `data` (массив).

---

## Этап 7 — Статический токен для фронтенда

1. **Settings → Access Tokens** — создать токен для пользователя с ролью, у которой есть **read** на:
   - `projects`, `project_gallery`, `services`, `process_steps`, `site_content`, `directus_files`
2. **Public** роль можно не открывать, если весь чтение идёт через токен.

**Проверка:**

В query Directus используются квадратные скобки (`filter[status][_eq]=…`). У **curl** символы `[` `]` по умолчанию включают режим glob; без отключения будет ошибка вида `curl: (3) bad range in URL`. Добавьте **`-g`** (это **`--globoff`**) перед URL.

```bash
# Замените на ваш реальный поддомен (латиницей, как в браузере). Плейсхолдер из доки не подставлять.
# Важно: БЕЗ слэша в конце. Иначе ${CMS}/items/... даст //items/... и Directus ответит
# ROUTE_NOT_FOUND: "Route //items/projects doesn't exist."
export CMS="https://cms.example.com"
export TOKEN="…"

# Убедитесь, что переменные заданы в ЭТОМ же сеансе терминала:
echo "$CMS"
# При необходимости срезать хвостовой слэш: CMS="${CMS%/}"

curl -gsS -o /dev/null -w "projects: %{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" \
  "${CMS}/items/projects?filter[status][_eq]=published&limit=1"

curl -gsS -o /dev/null -w "site_content: %{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" \
  "${CMS}/items/site_content/singleton"
```

Альтернатива без `-g`: закодировать скобки в URL, например  
`filter%5Bstatus%5D%5B_eq%5D=published`.

Если curl пишет **`URL rejected: No host part in the URL`**, а в выводе **`…: 000`** — почти всегда **`CMS` пустой** (не выполнили `export`, другой таб терминала, опечатка) или URL собрался без схемы/хоста. Проверка: `echo "[$CMS]"` должно показать полный `https://…`.

Если в JSON Directus: **`Route //items/... doesn't exist`** — в URL двойной слэш после хоста: уберите **`/`** в конце `CMS` или выполните **`CMS="${CMS%/}"`**.

Ожидается **200** для обоих (если singleton по другому URL — фронт пробует оба варианта, см. `frontend/src/api/cms.ts`). Во фронте `VITE_CMS_URL` тоже лучше без хвостового слэша (в коде он срезается, но так проще не путаться).

---

## Этап 8 — (Опционально) `migrate-sqlite-project-gallery-fk.mjs`

Нужен **только** если галерея O2M ломается (ошибки `Missing parentItem`, неверный тип `project_gallery.project`). Подробности в [CMS.md](./CMS.md).

```bash
sudo systemctl stop directus
node scripts/migrate-sqlite-project-gallery-fk.mjs /var/www/cms/data.db
sudo systemctl start directus
```

**Проверка:** скрипт вывел `OK`, Directus снова запущен, в админке проект открывается, галерея сохраняется.

---

## Этап 9 — Фронтенд (продакшен)

1. Скопируйте [frontend/.env.production.example](../frontend/.env.production.example) → `frontend/.env.production` (или задайте переменные в CI).

```env
VITE_CMS_URL=https://cms.ВАШ-ДОМЕН.ru
VITE_CMS_TOKEN=ваш_статический_токен_read
```

2. Сборка:

```bash
cd frontend
npm ci
npm run build
```

3. Раздайте содержимое `frontend/dist` через Nginx/статический хостинг.

**Проверка:**

- В браузере: сайт показывает данные из CMS. Тексты в **`site_content`** и опубликованные записи подтягиваются **при каждой полной перезагрузке страницы** (F5) — **пересборка фронта не нужна**, если уже зашили правильные `VITE_CMS_URL` и `VITE_CMS_TOKEN`. Пересобирайте только если меняли **сами переменные окружения** или код.
- DevTools → Network: запросы к `…/items/projects`, `…/items/services`, `…/items/site_content` — **200**. Если `VITE_CMS_URL` не был задан при **сборке**, в бандле нет обращений к API — используется статика из `content.ts`.

### Изменил поле в админке, на сайте по-прежнему старое

1. **Полная перезагрузка:** Ctrl+Shift+R / Cmd+Shift+R (или закрыть вкладку и открыть снова).
2. **Черновик:** у **`projects`** и **`services`** на фронте только **`status = published`**. Черновик в админке на сайте не появится.
3. **Сайт вообще не ходит в CMS:** откройте DevTools → **Network**, фильтр по `items` или по домену CMS. Нет запросов к Directus — при сборке не было `VITE_CMS_URL` / токена → нужен **`npm run build`** с `frontend/.env.production` и снова залить **`dist`**.
4. **Запрос падает (401/403/CORS):** в консоли ошибки `fetch`; тогда срабатывает fallback и/или старый **sessionStorage** (`agape_site_content_v2`). Очистите хранилище сайта: DevTools → Application → Session storage → удалить ключ `agape_site_content_v2`, снова F5.
5. **Редактировали не ту коллекцию/поле** — сверьтесь с [CMS.md](./CMS.md) (имена полей и singleton `site_content`).

### CORS — простыми словами

**Origin** в браузере — это схема + хост + порт страницы, с которой открыт сайт. Примеры:

- Сайт: `https://agapedesign.ru` → origin **`https://agapedesign.ru`**
- CMS: `https://cms.agapedesign.ru` → другой origin (другой поддомен).

Скрипт на **основном сайте** делает `fetch('https://cms.agapedesign.ru/items/...')` — это **межсайтовый** запрос. Браузер спрашивает у Directus: «можно ли странице с `https://agapedesign.ru` читать ответ?». Если в ответе нет подходящих заголовков **CORS** (например `Access-Control-Allow-Origin`), браузер **блокирует** ответ, в консоли будет ошибка — фронт у вас тогда падает в **fallback** (старый контент из `content.ts` или кэш сессии), и правки из админки **не видны**.

**Что сделать:** в настройках Directus (или в `.env` процесса Directus) разрешить origin основного сайта, например `https://agapedesign.ru`. Точные имена переменных зависят от версии Directus — см. [документацию Directus по CORS](https://directus.io/docs/self-hosted/config-options#cors).

**Зачем в доке фигурирует `/cms-directus`:** в **разработке** Vite проксирует `/cms-directus` → локальный Directus, и в браузере запрос идёт на **тот же** origin, что и страница (`localhost:5173`), поэтому **CORS не мешает**. В **продакшене** такого прокси нет: в `VITE_CMS_URL` указывают **полный URL** CMS (`https://cms.…`), и тогда Directus должен явно разрешить origin **лендинга** (или вы поднимаете обратный прокси на основном домене, например `https://agapedesign.ru/api/cms/…` → Directus — тогда для браузера origin один, но это отдельная настройка Nginx).

---

## Удобные команды из корня репозитория

После `npm install` в корне (опционально, для алиасов):

| Команда | Назначение |
|---------|------------|
| `npm run directus:bootstrap` | `node scripts/directus-bootstrap.mjs` |
| `npm run directus:migrate-gallery-fk -- /path/to/data.db` | починка FK SQLite (Directus остановить) |

---

## Бэкапы

- Регулярно копируйте файл **SQLite** (`data.db` или путь из `directus init`).
- Храните **`.env`** Directus (секреты, ключи) вне git.
- Токен фронта при компрометации — **отозвать** и выпустить новый.

---

## Частые проблемы

| Симптом | Действие |
|---------|----------|
| Сайт не подхватывает CMS | Проверить `VITE_CMS_URL` при **сборке**, пересобрать; см. [cmsSessionCache](../frontend/src/content/cmsSessionCache.ts) и очистку sessionStorage |
| Правки в админке не на сайте | F5 / сброс sessionStorage; статус **published**; нет ошибок CORS в консоли; см. подраздел выше в этапе 9 |
| 403 на `/assets/…` | Токен с read на `directus_files`; для картинок с другого origin — `?access_token=` (уже в `cms.ts`) |
| После обновления Directus — ошибки БД | `npx directus database migrate:latest` |
| Docker Hub недоступен | Использовать установку через **npm**, как в этом гайде |

---

## Связанные файлы в репозитории

- `scripts/directus-bootstrap.mjs` — схема + сиды
- `scripts/migrate-sqlite-project-gallery-fk.mjs` — экстренная миграция FK галереи
- `deploy/directus.service.example` — шаблон systemd
- `frontend/src/api/cms.ts` — запросы и маппинг
- `frontend/.env.local.example` — локальная разработка с Vite proxy
- `frontend/.env.production.example` — продакшен URL CMS
