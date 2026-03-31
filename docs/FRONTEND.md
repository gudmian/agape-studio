# Фронтенд — AGAPE

React + Vite + TypeScript. Без тяжёлых UI-фреймворков — только собственные компоненты.

## Стек

| Инструмент | Версия | Роль |
|------------|--------|------|
| React | 19 | UI-фреймворк |
| Vite | 8 | Бандлер + dev-сервер |
| TypeScript | 5.9 | Типизация |
| CSS Modules | — | Изолированные стили |
| Lucide React | — | Иконки (опционально) |

## Запуск

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
npm run build    # продакшн-сборка в dist/
npm run preview  # превью продакшн-сборки
npm run lint     # линтер
```

## Структура

```
src/
├── components/
│   ├── ui/
│   │   ├── Button.tsx / Button.module.css
│   │   └── Badge.tsx  / Badge.module.css
│   ├── layout/
│   │   ├── Header.tsx / Header.module.css
│   │   └── Footer.tsx / Footer.module.css
│   └── sections/
│       ├── HeroSection.tsx    / .module.css
│       ├── PortfolioSection.tsx / .module.css
│       ├── ServicesSection.tsx  / .module.css
│       ├── ProcessSection.tsx   / .module.css
│       └── ContactSection.tsx   / .module.css
├── data/
│   └── content.ts      ← ВСЕ тексты и данные сайта здесь
├── hooks/
│   └── useReveal.ts    ← scroll-анимации
├── styles/
│   ├── tokens.css      ← CSS-переменные (дизайн-токены)
│   └── global.css      ← глобальные стили, утилиты
├── types/
│   └── index.ts        ← TypeScript-типы
├── App.tsx
└── main.tsx
```

## Обновление контента

Весь контент сайта — тексты, проекты, услуги, шаги — находится в одном файле:

```
frontend/src/data/content.ts
```

### Добавить новый проект в портфолио

```ts
// content.ts → portfolio.projects
{
  id: 'my-new-project',        // уникальный slug
  title: 'Апартаменты',
  style: 'Контемпорари',
  area: '95 м²',
  city: 'Москва',
  imageUrl: '/images/projects/my-new-project.jpg',  // опционально
}
```

### Изменить услуги

```ts
// content.ts → services.items
// featured: true — выделяет карточку тёмно-зелёным фоном
{
  id: 'full',
  name: 'Полный',
  description: 'Сопровождение + авторский контроль',
  price: 'от 3 000 ₽/м²',
  featured: true,
  features: ['Пункт 1', 'Пункт 2'],
}
```

### Изменить этапы работы

```ts
// content.ts → process.steps
{
  number: '01',
  title: 'Знакомство',
  description: 'Описание этапа...',
}
```

## Подключение к CMS

Структура `content.ts` полностью типизирована (тип `SiteContent`). Для подключения CMS:

1. Создайте `src/api/content.ts` с функцией `fetchContent(): Promise<SiteContent>`
2. В `App.tsx` замените импорт `content` на `await fetchContent()`
3. Добавьте `<Suspense>` или loading state

Поддерживаемые CMS: Contentful, Strapi, Sanity, Directus, любой headless CMS с JSON API.

## Прокси API в dev-режиме

Vite настроен проксировать `/api/*` на `http://localhost:8080`:

```ts
// vite.config.ts
server: {
  proxy: {
    '/api': { target: 'http://localhost:8080', changeOrigin: true }
  }
}
```

Фронтенд отправляет форму на `POST /api/contact` — в dev она прокси на бэкенд, в продакшне работает через Vercel rewrites или Nginx.

## Scroll-анимации

Компоненты используют хук `useReveal()` и CSS-классы:

```tsx
const sectionRef = useReveal();
<section ref={sectionRef}>
  <div className="reveal">Появляется при скролле</div>
  <div className="reveal reveal-delay-3">С задержкой 0.3s</div>
</section>
```

Задержки: `reveal-delay-1` (0.1s) … `reveal-delay-5` (0.5s).  
Уважается `prefers-reduced-motion`.
