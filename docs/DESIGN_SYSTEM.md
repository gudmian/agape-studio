# Дизайн-система AGAPE

Все токены определены в `frontend/src/styles/tokens.css` и доступны как CSS-переменные.

## Цвета

| Токен | Hex | Применение |
|-------|-----|------------|
| `--color-primary` | `#3d4a2e` | Кнопки, акценты, карточка формы |
| `--color-primary-hover` | `#5a6b40` | Hover-состояние primary |
| `--color-dark` | `#2a2a24` | Основной текст, футер |
| `--color-background` | `#eeece4` | Фон секций Портфолио, Процесс |
| `--color-surface` | `#f5f3ed` | Фон секций Услуги, Контакты, карточки |
| `--color-surface-alt` | `#e8e6d6` | Фон изображений-плейсхолдеров |
| `--color-border` | `#d8d5cb` | Рамки карточек, разделители |
| `--color-text-secondary` | `#64645a` | Вторичный текст |
| `--color-text-muted` | `#8c8c80` | Eyebrow-метки, meta |
| `--color-hero-bg` | `#1a1f14` | Фон Hero (под фото) |

## Шрифты

Подключены через Google Fonts в `index.html`.

| Семейство | Применение |
|-----------|------------|
| **Cormorant Garamond** (Light 300, Regular 400) | Все заголовки, номера шагов |
| **Inter** (Light 300, Regular 400, Medium 500, SemiBold 600) | UI, body, кнопки, лейблы |

### Размеры шрифтов

```css
--text-hero: clamp(40px, 5.8vw, 84px)  /* H1 в Hero */
--text-h2:   clamp(28px, 2.8vw, 40px)  /* Заголовки секций */
--text-base: 16px                        /* Основной текст */
--text-xs:   13px                        /* Мелкий текст */
--text-label: 11px                       /* Eyebrow uppercase */
```

## Кнопки

Всегда pill-форма (`border-radius: 999px`). Три варианта:

| Вариант | Фон | Цвет текста | Использование |
|---------|-----|-------------|---------------|
| `primary` | `#3d4a2e` | `#f5f3ed` | Основной CTA |
| `secondary` | прозрачный | `#3d4a2e` | Вторичные действия |
| `ghost` | прозрачный | `#f5f3ed` | На тёмных фонах (Hero) |

Три размера: `sm` (33px), `md` (43px), `lg` (53px).

## Компоненты

### Badge
```tsx
<Badge variant="onDark">СТУДИЯ ДИЗАЙНА</Badge>
<Badge variant="accent">ПОПУЛЯРНЫЙ ВЫБОР</Badge>
<Badge variant="default">Тег</Badge>
```

### Button
```tsx
<Button variant="primary" size="lg">ОБСУДИТЬ ПРОЕКТ</Button>
<Button variant="ghost" size="lg">СМОТРЕТЬ РАБОТЫ</Button>
<Button variant="secondary" size="md">ОБСУДИТЬ</Button>
```

### Section Header (шаблон)
```tsx
<div className="section-header">
  <span className="eyebrow">EYEBROW LABEL</span>
  <h2 className="section-title">Заголовок секции</h2>
  <p className="section-subtitle">Подзаголовок секции</p>
</div>
```

## Scroll-анимации

Используйте классы `reveal` и `reveal-delay-N` на элементах внутри секции, где применён хук `useReveal()`:

```tsx
const sectionRef = useReveal();
return (
  <section ref={sectionRef}>
    <div className="reveal">Появляется при скролле</div>
    <div className="reveal reveal-delay-2">С задержкой 0.2s</div>
  </section>
);
```

## Адаптивность

Брейкпоинты определены в `tokens.css`:

```css
@media (max-width: 768px) { /* Планшет */ }
@media (max-width: 480px) { /* Мобильный */ }
```

Отступы секций (`--content-padding`): `80px` → `48px` → `20px`.
