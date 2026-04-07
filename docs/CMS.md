# CMS для AGAPE — подробная инструкция

Сайт сейчас берёт контент из `frontend/src/data/content.ts`. После подключения CMS редактор меняет данные в панели, а фронтенд подгружает их через REST API.

**Развёртывание Directus на VPS (пошагово, проверка каждого этапа, скрипты):** [DIRECTUS-VPS-DEPLOY.md](./DIRECTUS-VPS-DEPLOY.md).

---

## 1. Что выбрать

| Вариант | Плюсы | Минусы | Для вашего VPS (1 GB RAM) |
|---------|--------|--------|---------------------------|
| **Directus** (рекомендуется) | Гибкие коллекции, удобная админка, REST из коробки | Node.js, ~150–300 MB RAM | Подходит, лучше SQLite |
| **PocketBase** | Один бинарник Go, очень лёгкий | Другая модель данных, меньше «магии» | Идеально по ресурсам |
| **Strapi** | Популярен | Тяжелее Directus | На 1 GB тесно |
| **Облако** (Directus Cloud, Contentful) | Не грузит VPS | Платно / лимиты, данные не на вашем сервере | Если не хотите ставить ничего на VPS |

**Рекомендация для agapedesign.ru:** **Directus** с **SQLite** на том же VPS (порт за Nginx, например `https://cms.agapedesign.ru`), либо поддомен с базовой авторизацией.

> На Timeweb ранее был лимит Docker Hub — Directus проще поставить через **npm** (см. раздел 4B), без образов Docker.

---

## 2. Соответствие полей и вашего кода

Типы описаны в `frontend/src/types/index.ts` (`SiteContent`). В CMS нужно воспроизвести ту же логику.

### 2.1. Проекты портфолио — коллекция `projects`

| Поле в CMS | Тип | Обязательно | Соответствие в коде |
|------------|-----|-------------|---------------------|
| `slug` | string, unique | да | `id` (латиница, без пробелов) |
| `title` | string | да | `title` |
| `style` | string | да | `style` |
| `area` | string | да | `area` |
| `city` | string | да | `city` |
| `image` | file (image) | нет | → URL для `imageUrl` (обложка карточки и первый кадр галереи) |
| `gallery_items` | O2M → коллекция `project_gallery` | нет | **Рекомендуемый способ:** в карточке проекта блок со списком строк; в каждой строке поле `file` (картинка) и `sort` (порядок). На фронте подмешивается к `image` в `galleryUrls`. |
| `gallery` | JSON (массив UUID) | нет | *Устарело* (старый bootstrap): если поле ещё есть в БД, фронт по-прежнему учитывает его после O2M. |
| `image_placeholder_dark` | boolean | нет | если true → `imagePlaceholder: 'dark'` (опционально) |
| `sort` | integer | да | порядок в сетке |
| `status` | dropdown: published / draft | да | на фронте только `published` |

Коллекция **`project_gallery`**: поля `project` (M2O → `projects`), `file` (M2O → файл), `sort` (integer). Для **статического токена** API добавьте право **read** на `project_gallery`, иначе вложенные `gallery_items` не придут в ответ.

**SQLite:** у коллекций Directus первичный ключ `id` часто **INTEGER** (автоинкремент), а не UUID. Поле `project_gallery.project` обязано быть **того же типа**, что и `projects.id`. Если ранее bootstrap создал `project` как `uuid`/`char(36)` при integer PK, админка ломается при O2M. Актуальный `directus-bootstrap.mjs` подбирает тип по полю `projects.id`. Уже испорченную БД можно починить: `node scripts/migrate-sqlite-project-gallery-fk.mjs /путь/к/data.db` (Directus остановить).

**Если в админке при открытии проекта — «Page Not Found»:** часто это сломанные метаданные O2M (`gallery_items`) после ручного дублирования связей или создания relation до поля. В DevTools → Network проверьте ответ `GET /items/projects/<uuid>`. Упростите схему: в Data Model удалите лишние связи «картинка ↔ проект», оставьте одну цепочку `project_gallery.project` → `projects` и O2M `gallery_items` на `projects`. Либо пере-создайте поле `gallery_items` и связь в правильном порядке (в новых версиях bootstrap сначала создаётся alias, затем relation). На пустой БД можно заново прогнать `directus-bootstrap.mjs`.

**`[INTERNAL_SERVER_ERROR] Missing parentItem '1' of 'projects' when merging o2m nested items`** (при добавлении кадра в галерею на карточке проекта):

1. **Обновите Directus до ≥ 11.4.0** — в 11.3.x были регрессии слияния O2M/M2O ([PR #24316](https://github.com/directus/directus/pull/24316)).
2. **«Сироты» в `project_gallery`:** в БД не должно быть строк, где `project` не совпадает ни с одним `projects.id` (часто после экспериментов тип в колонке не UUID). В SQLite: `SELECT * FROM project_gallery WHERE project NOT IN (SELECT id FROM projects);` — удалите или исправьте такие строки.
3. **Лишние alias-поля на `projects`** (ещё один M2M «файлы», дублирующая связь): как в [issue #24349](https://github.com/directus/directus/issues/24349), лишнее реляционное поле может ломать merge — оставьте только `image`, `gallery_items` и обычные поля.
4. **Шаблон списка O2M:** если у поля `gallery_items` в интерфейсе указано `{{file.$thumbnail}}`, смените на простой шаблон (например `{{sort}}`) — см. актуальный `directus-bootstrap.mjs`.
5. **Обходной путь без вложенного редактора:** создавайте записи в коллекции **`project_gallery`** отдельно (Content → Project Gallery → Create), в поле **Project** выберите нужный проект и **File** — картинку. Так обходится баг слияния на форме проекта.

### 2.2. Услуги (тарифы) — коллекция `services`

| Поле | Тип | Соответствие |
|------|-----|--------------|
| `slug` | string, unique | `id` |
| `name` | string | `name` |
| `description` | string | `description` |
| `price` | string | `price` |
| `featured` | boolean | `featured` |
| `features` | JSON (массив строк) или repeater | `features[]` |
| `sort` | integer | порядок карточек |
| `status` | published / draft | фильтр на фронте |

### 2.3. Этапы работы — коллекция `process_steps`

| Поле | Тип | Соответствие |
|------|-----|--------------|
| `number` | string | `number` (01, 02, …) |
| `title` | string | `title` |
| `description` | text | `description` |
| `sort` | integer | порядок |

### 2.4. Тексты секций — singleton (одна запись)

Удобно завести **одну** коллекцию `site_content` с типом singleton (в Directus: Settings → создать коллекцию и включить «Singleton»), либо несколько singleton:

**Вариант A — один singleton `site_content` (много полей):**

- `meta_title`, `meta_description`
- `hero_badge`, `hero_headline_line1`, `hero_headline_line2`, `hero_subtitle`, `hero_cta_primary`, `hero_cta_secondary`
- `hero_background_image` — **файл (image)** для фона Hero (топовая работа); на сайте — эффект parallax при скролле (отключается при `prefers-reduced-motion`)
- `portfolio_eyebrow`, `portfolio_title`, `portfolio_subtitle`
- `services_eyebrow`, `services_title`
- `process_eyebrow`, `process_title_line1`, `process_title_line2`, `process_description`
- `contact_eyebrow`, `contact_title`, `contact_description` (можно WYSIWYG или textarea с `\n`)
- плейсхолдеры формы: `form_name_placeholder`, …
- `footer_copyright`

**Вариант B — несколько singleton:** `site_meta`, `hero`, `portfolio_header`, `services_header`, `process_header`, `contact_block`, `footer` — проще для редактора, чуть больше кликов в админке.

---

## 3. Безопасность CMS

1. **Не открывать** панель CMS на общий IP без HTTPS — только `https://cms.agapedesign.ru`.
2. Создать **отдельного пользователя** только с правами «редактор контента», не админ.
3. В Directus: **Settings → Access Tokens** — создать **статический токен только на чтение** (`read` для нужных коллекций) для фронтенда. Этот токен положить в переменные окружения при **сборке** фронта (`VITE_CMS_TOKEN`) — он попадёт в бандл; для публичного сайта это нормально при ограничении прав токена.
4. Лучше: проксировать API CMS через **ваш Go-бэкенд** (`GET /api/cms/...`), токен хранить только на сервере — тогда в браузере токена нет (следующий этап разработки).

---

## 4. Установка Directus на VPS (Timeweb)

### 4A. Поддомен в DNS

В панели домена добавьте:

| Тип | Имя | Значение |
|-----|-----|----------|
| A | `cms` | `92.51.38.130` |

Подождите распространения DNS (обычно до 30 минут).

### 4B. Установка без Docker (обход лимита Docker Hub)

На сервере под `root` (или отдельный пользователь `directus`):

```bash
# Node.js уже есть на сервере (20.x)
mkdir -p /var/www/cms && cd /var/www/cms
npm init -y
npm install directus
npx directus init
```

На вопросы `directus init`:

- **Database client:** SQLite  
- **Database file:** `/var/www/cms/database.sqlite` (или путь по желанию)  
- **Admin email / password:** свои, надёжный пароль  

Запуск вручную для проверки:

```bash
cd /var/www/cms
npx directus start
```

Для постоянной работы — **systemd** (пример):

```ini
# /etc/systemd/system/directus.service
[Unit]
Description=Directus CMS
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/cms
ExecStart=/usr/bin/npx directus start
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=8055
Environment=PUBLIC_URL=https://cms.agapedesign.ru

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable directus
systemctl start directus
```

Directus слушает порт **8055** (или тот, что задали в `PORT`).

### 4C. Nginx — прокси на Directus

Nginx принимает запросы с интернета (порты 80/443) и передаёт их на локальный **Directus** (`127.0.0.1:8055`). Отдельный файл в `sites-available` — обычная схема на Debian/Ubuntu; **симлинк** в `sites-enabled` «включает» этот сайт без копирования файла.

#### Шаг 1 — конфиг в `sites-available`

Создайте файл (замените `cms.agapedesign.ru` на ваш поддомен):

```bash
sudo nano /etc/nginx/sites-available/cms
```

Содержимое для **первого этапа (только HTTP, порт 80)** — так Certbot сможет проверить домен и выдать сертификат:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name cms.agapedesign.ru;

    location / {
        proxy_pass http://127.0.0.1:8055;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Сохраните файл (`Ctrl+O`, Enter, `Ctrl+X` в nano).

#### Шаг 2 — симлинк в `sites-enabled`

**Зачем:** в основном конфиге Nginx обычно есть строка `include /etc/nginx/sites-enabled/*;` — обрабатываются только конфиги из этой папки. Файл в `sites-available` — «источник правды»; симлинк — короткая ссылка на него же, чтобы легко отключать сайт (`unlink` симлинка) без удаления файла.

Создайте симлинк (имя справа — **абсолютный путь** к файлу в `sites-available`):

```bash
sudo ln -s /etc/nginx/sites-available/cms /etc/nginx/sites-enabled/cms
```

Проверка, что ссылка создалась:

```bash
ls -la /etc/nginx/sites-enabled/cms
# Должно быть что-то вроде: cms -> /etc/nginx/sites-available/cms
```

Если ошиблись, удалите только симлинк и создайте заново:

```bash
sudo rm /etc/nginx/sites-enabled/cms
sudo ln -s /etc/nginx/sites-available/cms /etc/nginx/sites-enabled/cms
```

На чистой установке в `sites-enabled` часто лежит дефолтный `default` — он может перехватывать запросы по IP или конфликтовать по `server_name`. Если при открытии поддомена открывается не Directus, отключите дефолт:

```bash
sudo rm /etc/nginx/sites-enabled/default
```

(или переименуйте, если хотите сохранить файл: `sudo mv /etc/nginx/sites-enabled/default /etc/nginx/sites-available/default.disabled`.)

#### Шаг 3 — проверка синтаксиса и перезагрузка Nginx

```bash
sudo nginx -t
```

Ожидается: `syntax is ok` и `test is successful`. Затем:

```bash
sudo systemctl reload nginx
```

**Проверка до HTTPS:** с вашего компьютера (DNS уже указывает на VPS):

```bash
curl -sI http://cms.agapedesign.ru/admin/login | head -n 3
```

Должен быть ответ **200** или **3xx** от вашего сервера. Убедитесь, что **Directus запущен** на `8055`.

#### Шаг 4 — установка Certbot (если ещё нет)

На Ubuntu/Debian:

```bash
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx
```

#### Шаг 5 — выпуск сертификата Let’s Encrypt

Условия: домен **уже** в DNS ссылается на IP этого сервера; порты **80** (и после выпуска **443**) доступны с интернета; Nginx слушает `:80` для вашего `server_name` (как в шаге 1).

Интерактивный вариант (удобно первый раз — задаст вопросы по email и ToS):

```bash
sudo certbot --nginx -d cms.agapedesign.ru
```

Неинтерактивный вариант (скрипты, CI):

```bash
sudo certbot --nginx \
  -d cms.agapedesign.ru \
  --non-interactive \
  --agree-tos \
  -m ваш@email.ru \
  --redirect
```

Что делает **`--nginx`:** Certbot сам правит конфиг Nginx — добавляет второй `server` для **443**, пути к сертификату и ключу, и блок для редиректа с HTTP на HTTPS.

Что делает **`--redirect`:** для порта 80 настраивается редирект **301** на `https://…`, чтобы админка и API всегда шли по HTTPS.

Проверка после выпуска:

```bash
curl -sI https://cms.agapedesign.ru/admin/login | head -n 5
sudo certbot certificates
```

#### Автопродление

Установщик обычно ставит **timer** systemd. Проверка:

```bash
sudo systemctl status certbot.timer
sudo certbot renew --dry-run
```

Сертификаты Let’s Encrypt короткие (~90 дней); `renew` обновит их при приближении срока.

#### Directus и публичный URL

В **Settings → Project Settings** Directus укажите **Public URL** вида `https://cms.agapedesign.ru` — в тон с тем, что вы задали в `PUBLIC_URL` для systemd (раздел 4B).

---

## 5. Настройка коллекций в Directus (пошагово)

1. Войти в `https://cms.agapedesign.ru/admin`.
2. **Settings → Data Model → Create Collection**  
   - `projects` — не singleton  
   - Включить **Archive** (мягкое удаление) по желанию  
3. Добавить поля таблицы из раздела 2.1 (типы в Directus: String, Integer, Image, Toggle и т.д.).
4. Аналогично создать `services`, `process_steps`.
5. Создать singleton `site_content` (или набор singleton из раздела 2.4) и поля.
6. **Settings → Roles & Permissions → Public** — по умолчанию всё закрыто.  
   Для чтения с фронта: либо выдать **Public** `read` на опубликованные поля (осторожно), либо использовать **Static Token** пользователя с ролью «Reader».
7. Заполнить тестовыми данными (скопировать из `content.ts`).

### REST API Directus (примеры)

Список проектов (с токеном в заголовке):

```http
GET https://cms.agapedesign.ru/items/projects?filter[status][_eq]=published&sort=sort
Authorization: Bearer <STATIC_TOKEN>
```

В **curl** к тому же URL добавьте **`-g`** (`--globoff`), иначе `[` и `]` в строке запроса интерпретируются как шаблон и curl выдаст ошибку `bad range in URL`.

Singleton:

```http
GET `https://cms.agapedesign.ru/items/site_content/singleton` **или** (в части сборок) `GET …/items/site_content` — фронт пробует оба варианта.
Authorization: Bearer <STATIC_TOKEN>
```

Поля в ответе будут в `data` (массив или объект для singleton).

---

## 6. Подключение фронтенда (логика работ)

1. Добавить в проект переменные (локально `.env.local`, на сервере перед `npm run build`):

```env
VITE_CMS_URL=https://cms.agapedesign.ru
VITE_CMS_TOKEN=ваш_статический_токен_только_read
```

2. Реализовать `frontend/src/api/cms.ts`:  
   - `fetchProjects()`, `fetchServices()`, `fetchProcessSteps()`, `fetchSiteContent()`  
   - маппинг ответа Directus к типам `Project`, `Service`, `ProcessStep`, `SiteContent`.

3. В `App.tsx` (или через React Query / `useEffect`):  
   - при загрузке запросить CMS;  
   - при ошибке или пустом ответе — **fallback** на импорт из `content.ts` (как сейчас).

4. На VPS после изменений:

```bash
cd /var/www/agape && git pull
cd frontend && npm run build
# перезапуск nginx не обязателен
```

---

## 7. Чеклист «с нуля до редактирования из CMS»

Расширенный чеклист с командами проверки: [DIRECTUS-VPS-DEPLOY.md](./DIRECTUS-VPS-DEPLOY.md).

- [ ] DNS: `A` для `cms` → IP сервера  
- [ ] Directus установлен, systemd, порт 8055  
- [ ] Nginx + SSL для `cms.agapedesign.ru`  
- [ ] `npx directus database migrate:latest` при необходимости  
- [ ] `node scripts/directus-bootstrap.mjs` (или `npm run directus:bootstrap` из корня репозитория)  
- [ ] Роли: токен только на чтение для фронта  
- [ ] Данные в CMS (bootstrap или ручной ввод)  
- [ ] Фронт: `frontend/src/api/cms.ts` + `VITE_CMS_*` + `SiteContentProvider`  
- [ ] Сборка с `frontend/.env.production` (см. `.env.production.example`)  

---

## 8. Альтернатива: PocketBase

Если Directus окажется тяжёлым для 1 GB:

1. Скачать [PocketBase](https://pocketbase.io/docs/) для Linux amd64 на сервер.  
2. Запустить бинарь, создать коллекции в UI, выдать API rules на чтение.  
3. На фронте — другой формат JSON; маппинг в те же типы `SiteContent`.

---

## 9. Полезные ссылки

- [Directus Docs](https://directus.io/docs/)  
- [Directus REST API](https://directus.io/docs/guides/connect/query-parameters)  
- Типы контента проекта: `frontend/src/types/index.ts`  
- Текущий статический контент: `frontend/src/data/content.ts`  

После внедрения кода обновите этот файл, если измените имена коллекций или URL.
