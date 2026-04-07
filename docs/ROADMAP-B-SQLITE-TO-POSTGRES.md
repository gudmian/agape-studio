# Переход к новой БД из состояния A: SQLite -> PostgreSQL без потери данных

Этот документ описывает безопасную миграцию данных после завершения этапа A (атомарный деплой + rollback).

Цель этапа B:
- перейти с SQLite на PostgreSQL;
- не потерять исторические лиды и служебные данные;
- сохранить быстрый rollback.

---

## 0) Предпосылки

Перед началом убедитесь, что этап A уже внедрен:
- есть release-процесс с `current`;
- есть рабочий rollback;
- есть регулярные backup SQLite.

Также зафиксируйте окно миграции (лучше ночью) и заранее предупредите о коротком read-only периоде.

---

## 1) Целевая архитектура на этапе B

- Бэкенд AGAPE читает/пишет в PostgreSQL.
- SQLite остается как резервная историческая копия.
- `DATABASE_URL` в `shared/backend/.env` меняется на postgres DSN.
- Деплой идет тем же процессом этапа A.

---

## 2) Подготовка PostgreSQL

Можно выбрать любой вариант:
- managed (Railway/Neon/Supabase/Timeweb managed);
- self-hosted Postgres на VPS (менее желательно для production).

Рекомендуемый путь: managed Postgres.

Создайте:
- базу `agape`;
- пользователя `agape_app` с отдельным паролем;
- ограниченные права (минимально нужные для приложения).

Пример `DATABASE_URL`:

```env
DATABASE_URL=postgres://agape_app:***@host:5432/agape?sslmode=require
```

---

## 3) Подготовка кода: dual-readiness

Перед миграцией в production сделайте релиз, который:
1. Поддерживает Postgres в репозитории (`pgx` или `database/sql + pq/pgx`);
2. Создает схему через миграции;
3. Проходит тесты на SQLite и Postgres (на CI желательно через сервис postgres).

Минимум по схеме:
- таблица `contact_requests`;
- индексы по `created_at`, `status`;
- корректные `NOT NULL` и дефолты.

Важно:
- сначала выкатываем код, который умеет работать с Postgres;
- только потом переключаем `DATABASE_URL`.

---

## 4) План миграции данных (безопасный)

## 4.1 Freeze изменений (короткое окно)

Варианты:
- временно отключить POST `/api/contact` (maintenance mode), или
- краткий downtime на 1-3 минуты.

Цель: не принимать новые записи во время финального копирования.

## 4.2 Финальный backup SQLite

```bash
systemctl stop agape-backend
sqlite3 /var/www/agape/shared/backend/data/agape.db ".backup '/root/backups/agape-final-$(date +%F-%H%M).db'"
```

Проверьте, что файл создан и ненулевой.

## 4.3 Экспорт SQLite в переносимый формат

Простой путь:
1. выгрузить CSV по таблицам;
2. загрузить в Postgres через `\copy`.

Пример:

```bash
sqlite3 -header -csv /var/www/agape/shared/backend/data/agape.db \
  "SELECT id,name,phone,email,message,created_at,status,notes,updated_at FROM contact_requests ORDER BY id;" \
  > /tmp/contact_requests.csv
```

## 4.4 Импорт в Postgres

В psql:

```sql
\copy contact_requests (id,name,phone,email,message,created_at,status,notes,updated_at)
FROM '/tmp/contact_requests.csv' WITH (FORMAT csv, HEADER true);
```

После импорта синхронизируйте sequence:

```sql
SELECT setval(
  pg_get_serial_sequence('contact_requests', 'id'),
  COALESCE((SELECT MAX(id) FROM contact_requests), 1),
  true
);
```

---

## 5) Верификация целостности данных

Сверьте минимум:
- количество строк;
- min/max `id`;
- последние 20 записей по `created_at`;
- выборочные записи по email/телефону.

Примеры проверок:

SQLite:
```bash
sqlite3 /var/www/agape/shared/backend/data/agape.db "SELECT COUNT(*) FROM contact_requests;"
```

Postgres:
```bash
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM contact_requests;"
```

Если расхождения есть — не переключайте прод.

---

## 6) Cutover: переключение production на Postgres

1. В `shared/backend/.env` замените `DATABASE_URL` на Postgres DSN.
2. Запустите деплой этапа A (новый релиз с поддержкой Postgres).
3. Поднимите сервис:

```bash
systemctl start agape-backend
```

4. Smoke-check:
- `/health` локально и снаружи;
- `POST /api/contact`;
- `GET /api/leads` с токеном.

5. Разморозьте прием заявок.

---

## 7) Rollback план на этапе B

Если после cutover есть ошибка:
1. Остановите backend.
2. Верните в `shared/backend/.env` старый SQLite `DATABASE_URL`.
3. Перезапустите backend.
4. При необходимости выполните `agape-rollback.sh` на предыдущий релиз.

Потери данных не будет, если вы не писали в Postgres после переключения или если учли эти записи вручную.

---

## 8) Пост-миграционные шаги

В течение 7-14 дней:
- храните SQLite как immutable backup;
- мониторьте ошибки БД, latency и pool;
- настройте бэкапы Postgres (PITR, daily snapshots);
- добавьте алертинг на недоступность БД.

После стабилизации:
- отключите runtime-зависимость от SQLite;
- оставьте только архивные дампы.

---

## 9) Риски и как их снять

- Риск: рассинхрон счетчиков `id` -> фикс через `setval`.
- Риск: несовместимость типов дат -> заранее прогоните тестовый импорт.
- Риск: запись в момент миграции -> freeze окна и остановка backend.
- Риск: долгий downtime -> потренируйте dry-run на staging.

---

## 10) Критерии завершения этапа B

Этап B завершен, если:
- прод стабильно работает на Postgres;
- данные 1:1 перенесены и сверены;
- backup/restore для Postgres проверены;
- rollback на SQLite документирован и проверен;
- SQLite выведен из активной эксплуатации.

После этого можно переходить к этапу C (enterprise-путь).
