# CMS для AGAPE — подробная инструкция

Сайт сейчас берёт контент из `frontend/src/data/content.ts`. После подключения CMS редактор меняет данные в панели, а фронтенд подгружает их через REST API.

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
| `image` | file (image) | нет | → URL для `imageUrl` |
| `image_placeholder_dark` | boolean | нет | если true → `imagePlaceholder: 'dark'` (опционально) |
| `sort` | integer | да | порядок в сетке |
| `status` | dropdown: published / draft | да | на фронте только `published` |

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

Добавьте файл `/etc/nginx/sites-available/cms` (и симлинк в `sites-enabled`):

```nginx
server {
    listen 80;
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

Проверка и перезагрузка:

```bash
nginx -t && systemctl reload nginx
certbot --nginx -d cms.agapedesign.ru --non-interactive --agree-tos -m ваш@email.ru --redirect
```

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

- [ ] DNS: `A` для `cms` → IP сервера  
- [ ] Directus установлен, systemd, порт 8055  
- [ ] Nginx + SSL для `cms.agapedesign.ru`  
- [ ] Коллекции `projects`, `services`, `process_steps` + singleton текста  
- [ ] Роли: токен только на чтение для фронта  
- [ ] Данные перенесены из `content.ts`  
- [ ] В репозитории: `api/cms.ts` + env + загрузка в `App.tsx`  
- [ ] Сборка на сервере с `VITE_CMS_*`  

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
