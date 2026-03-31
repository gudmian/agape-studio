# AGAPE — Студия авторского дизайна интерьеров

Адаптивный сайт-портфолио для студии дизайна интерьеров. Построен на React + Vite (фронтенд) и Go + SQLite (бэкенд).

## Структура проекта

```
AGAPE/
├── frontend/           React + Vite + TypeScript
│   ├── src/
│   │   ├── components/ Компоненты (ui/, layout/, sections/)
│   │   ├── data/       Контент сайта (content.ts)
│   │   ├── hooks/      useReveal (scroll-анимации)
│   │   ├── styles/     CSS-токены и глобальные стили
│   │   └── types/      TypeScript-типы
│   └── vercel.json     Деплой на Vercel
├── backend/            Go API + SQLite
│   ├── cmd/server/     Точка входа
│   ├── internal/       config, handler, middleware, model, repository
│   ├── Dockerfile      Продакшн-образ
│   └── Dockerfile.dev  Dev-образ с hot-reload (Air)
├── docs/               Документация
├── docker-compose.yml      Продакшн
├── docker-compose.dev.yml  Разработка
├── nginx.conf          Пример конфига для VPS
└── .env.example        Шаблон переменных окружения
```

## Быстрый старт

### Только фронтенд (без API)

```bash
cd frontend
npm install
npm run dev    # http://localhost:5173
```

### Фронтенд + Бэкенд (локально)

```bash
# Терминал 1 — бэкенд
cd backend
cp .env.example .env
go run ./cmd/server/main.go

# Терминал 2 — фронтенд
cd frontend
npm install
npm run dev
```

### Через Docker Compose (продакшн-режим локально)

```bash
cp .env.example .env
# Заполните CORS_ORIGINS в .env

docker compose up --build -d
cd frontend && npm run dev
```

## Секции сайта

| Секция | Описание |
|--------|----------|
| Hero | Полноэкранный баннер со слоганом и CTA |
| Портфолио | Сетка 6 проектов (3→2→1 колонка) |
| Услуги | 3 пакета: Базовый / Полный / Под ключ |
| Как мы работаем | 5 этапов работы |
| Контакты | Форма заявки (сохраняется в SQLite) |

## Адаптивность

| Брейкпоинт | Ширина | Портфолио | Услуги |
|------------|--------|-----------|--------|
| Desktop | ≥ 769px | 3 колонки | 3 в ряд |
| Tablet | ≤ 768px | 2 колонки | 3 в ряд (уже) |
| Mobile | ≤ 480px | 1 колонка | стек |

## API

| Метод | Путь | Описание |
|-------|------|----------|
| GET | /health | Проверка состояния |
| POST | /api/contact | Отправка заявки |
| GET | /api/projects | Список проектов |
| GET | /api/services | Список услуг |

## Документация

- [Дизайн-система](docs/DESIGN_SYSTEM.md)
- [Фронтенд](docs/FRONTEND.md)
- [Бэкенд](docs/BACKEND.md)
- [Деплой](docs/DEPLOY.md)
