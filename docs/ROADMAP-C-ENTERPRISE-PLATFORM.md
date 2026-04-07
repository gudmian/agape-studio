# Переход к варианту C из состояния A + Postgres

Этот документ описывает, как перейти от улучшенного single-VPS процесса к enterprise-стилю: контейнеры, окружения, promotion, наблюдаемость, безопасные выкаты.

Важно: этап C намеренно избыточен для маленького проекта, но отлично подходит для набора production-опыта.

---

## 0) Что считать вариантом C

На выходе:
- сервисы работают как containerized workload;
- есть отдельные окружения `dev/stage/prod`;
- деплой идет через артефакты (immutable images), а не через сборку на сервере;
- есть стратегии выката (blue/green или canary);
- есть централизованные логи/метрики/алерты;
- есть формальные runbook и incident-процесс.

---

## 1) Рекомендуемая траектория C (по шагам)

Чтобы не сорвать production, проходите C в 3 фазы:

1. **C1: Container Platform Lite**
   - Docker image для backend/frontend;
   - image registry;
   - deploy через pull image + restart;
   - stage окружение.

2. **C2: Promotion + Quality Gates**
   - полноценный CI pipeline;
   - автоматический deploy в stage;
   - ручной approval в prod;
   - db migrations как отдельный контролируемый шаг.

3. **C3: SRE/Enterprise Practices**
   - blue/green или canary;
   - observability stack;
   - SLO/SLI + incident runbook;
   - security scanning и policy checks.

---

## 2) Фаза C1: Container Platform Lite

## 2.1 Контейнеризуйте backend/frontend

У вас уже есть `backend/Dockerfile`; убедитесь, что:
- образ минимальный и non-root;
- healthcheck есть;
- конфиг только через env.

Для frontend:
- multi-stage build (`node -> nginx:alpine`) или статический хост отдельно.

## 2.2 Registry и versioning

Публикуйте образы в registry (GHCR/Docker Hub/private):
- `ghcr.io/<org>/agape-backend:<git_sha>`
- `ghcr.io/<org>/agape-frontend:<git_sha>`
- опционально `:main`, `:release-YYYYMMDD`.

Запретите deploy по mutable тегу `latest` в prod.

## 2.3 Stage окружение

Поднимите stage:
- отдельный поддомен;
- отдельная Postgres БД/схема;
- копия production-конфига без боевых секретов.

Цель: все изменения сначала проходят stage, потом prod.

---

## 3) Фаза C2: Promotion pipeline

## 3.1 CI pipeline

На каждый PR:
- backend: `fmt/vet/test`, build image;
- frontend: `lint/build`;
- security: dependency scan + container scan;
- integration tests на stage-like окружении.

На merge в `main`:
- push immutable image в registry;
- auto deploy в stage;
- smoke + integration checks.

## 3.2 Release promotion

Прод деплой только через promotion конкретного image tag:
- `promote <sha> stage -> prod`.

Не пересобирайте образ для prod: используйте тот же digest, что прошел stage.

## 3.3 Миграции БД

Миграции должны быть:
- versioned;
- backward-compatible (expand/contract);
- выполняться отдельным джобом до переключения трафика.

Стратегия:
1. Expand migration (добавить новое, не ломая старое).
2. Деплой приложения.
3. Contract migration (удалить старое позже).

---

## 4) Фаза C3: Blue/Green, observability, SRE

## 4.1 Blue/Green deploy

Схема:
- `blue` = текущий prod;
- `green` = новая версия;
- прогрев + smoke на `green`;
- switch трафика через Nginx/LB;
- при проблеме мгновенный switch назад.

Для начала реализуйте хотя бы "pseudo blue/green" на двух systemd-сервисах и разных портах.

## 4.2 Observability stack

Минимум:
- logs: Loki + Promtail + Grafana (или ELK);
- metrics: Prometheus + Grafana;
- errors/traces: Sentry + OpenTelemetry.

Обязательные метрики:
- RPS, latency p50/p95/p99;
- error rate 4xx/5xx;
- uptime health endpoint;
- DB connection errors/timeouts.

## 4.3 Алертинг

Алерты в Telegram/Slack:
- health endpoint down > 1 мин;
- 5xx выше порога;
- p95 latency выше порога;
- disk/memory pressure;
- failed deploy/migration.

---

## 5) Security и compliance практики

На этапе C внедрите:
- secret manager (не хранить секреты в файлах на сервере);
- image signing и provenance (Cosign/SLSA-level базово);
- policy checks (например, запрет root-контейнеров);
- регулярный dependency/container scan;
- ротацию ключей и токенов по расписанию.

---

## 6) Роли и операционный процесс (как в командах)

Минимальный release-процесс:
1. Dev открывает PR.
2. CI автоматически проверяет.
3. Reviewer аппрувит.
4. Merge в `main`.
5. Автодеплой в stage.
6. QA smoke + acceptance checklist.
7. Manual approval в prod.
8. Post-deploy verification.

Документы, которые стоит вести:
- release checklist;
- rollback runbook;
- incident template (severity, timeline, root cause, actions);
- changelog релизов.

---

## 7) Практический поэтапный план внедрения C (8-12 недель)

Недели 1-2:
- registry + immutable images;
- stage окружение;
- auto deploy в stage.

Недели 3-4:
- production promotion pipeline;
- migration tool и политика expand/contract;
- release approval flow.

Недели 5-6:
- logs/metrics dashboards;
- алерты;
- SLO baseline.

Недели 7-8:
- blue/green deploy;
- controlled rollback drills;
- incident game-day.

Недели 9-12:
- security hardening (secret manager, scans, signing);
- документация и операционные регламенты.

---

## 8) Критерии завершения этапа C

Этап C можно считать внедренным, если:
- прод выкатывается только из immutable image, прошедшего stage;
- миграции и деплой разделены и управляемы;
- rollback занимает минуты и регулярно тестируется;
- есть централизованная наблюдаемость и алерты;
- есть формализованный release/incident процесс.

---

## 9) С чего начать уже сейчас

Первый практический шаг после этапа B:
1. Поднимите stage с Postgres.
2. Сделайте CI, публикующий backend image в registry.
3. Настройте auto deploy в stage с smoke-check.

Это даст максимальный прирост "как в компаниях" при умеренной сложности, и станет фундаментом для следующих практик C.
