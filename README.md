# Админка Sellgar

Админский интерфейс Sellgar. Репозиторий собран как Yarn workspaces, основной клиент находится в `code/clients/admin`.

## Структура репозитория

- `code/` — Yarn workspaces, исходники и инструменты разработки.
- `code/clients/admin/nginx/` — `nginx.conf` и `conf.d/default.conf`.
- `Dockerfile` и `.dockerignore` — контейнерная сборка из корня репозитория.
- `.github/workflows/ci.yml` — сборка и публикация, отдельные тесты и Helm-деплой в dev.
- `.github/workflows/production.yml` — ручная подготовка production-выпуска без пересборки.
- `helm/values.app.yaml` — общие настройки запуска: порт, volumes, probes, ingress path.
- `helm/dev/values.yaml`, `helm/prod/values.yaml` — настройки сред и ConfigMap с `config.js`.
- Общий chart — `sellgar.infrastructure/charts/application`; templates в приложении нет.
- `docs/` — документация; `.gitmodules` — пути вложенных библиотек.

## Стек

- React 19, Vite, TypeScript.
- Runtime приложения: `@sellgar/app`.
- Route tokens: отдельный пакет `@library/route-tokens`.
- DI: bindings из `@sellgar/app` и `inversify`.
- UI kit: `@sellgar/kit`, иконки из `@sellgar/kit/icons`.
- Доменный слой и HTTP: `@library/domain`.

## Входные точки

- `code/clients/admin/src/main.tsx` подключает стили `@sellgar/kit` и глобальные стили.
- `code/clients/admin/src/bootstrap.tsx` создает `AdminApplication`, рендерит React root и запускает initializer.
- `code/clients/admin/src/application/admin.application.tsx` описывает application-wide components, shell, initializers и features; route graph находится в `src/application/routes`.
- `code/clients/admin/src/application/bindings/admin.bindings.ts` регистрирует application/domain зависимости.
- `code/clients/admin/src/sw/service-worker.tsx` показывает UI обновления service worker.

## Рабочие области

- `code/clients/admin` - host-приложение и composition root.
- `code/layouts/*` - layout-пакеты приложения.
- `code/modules/*` - route-level страницы.
- `code/frames/*` - вложенные route workflows, отображаемые через единый application-level `Drawer`.
- `code/widgets/*` - переиспользуемые встраиваемые UI-блоки.
- `code/providers/*` - отдельные пакеты `@provider/*` для переиспользуемых runtime providers.
- `code/library/*` - общие библиотеки runtime/design/domain/message/push.
- `code/utils/*` - общие утилиты без UI.

## Основные маршруты

- `/sign-in` - публичный вход.
- `/` - dashboard.
- `/shops` - магазины.
- `/products` - список товаров, `/products/create` и `/products/:uuid` - форма товара.
- `/store` - складские позиции и вложенные drawer routes.
- `/brands`, `/categories`, `/units`, `/properties` - списки и вложенные create/edit drawer routes.

## Скрипты

```bash
cd code
yarn install --immutable
yarn dev:admin_ui
yarn build:admin_ui
yarn test
```

## Документация

- `docs/architecture.md` - карта приложения и границы пакетов.
- `docs/development` - правила разработки и runtime-контракты.
- `docs/design` - процесс проектирования изменений.
- `docs/agent` - инструкции для агентской работы.

## CI и доставка

Push в `development` запускает build → publish → test → deploy.
`test` — отдельная job с unit/компонентными тестами из Docker target `tests`.
Если тесты не прошли, deploy не запускается.
Сборка, тесты и публикация выполняются на GitHub-hosted runners;
deploy — на repository-scoped runner в dev VM.
Обычная раскатка выполняется Helm с ожиданием готовности и проверкой image digest.
Argo CD продолжает управлять платформой, но не этим приложением.

Docker targets: `application`, `tests`.
Миграционного образа и миграционной job у этого приложения нет.

Настройки среды хранятся в `helm/dev/values.yaml`, Secret refs — в
`helm/values.app.yaml`. Версионный immutable ConfigMap монтируется через
`environmentFile`; значения credentials не передаются в GitHub-hosted jobs или Git.
Внутренний HTTP-порт — 8080, в dev одна реплика.

PR запускает build/test без публикации и деплоя. Push в `release/*` публикует
кандидат с `release.json`; ручной production workflow из `master` принимает
`candidate-<run-number>.<attempt>`, проверяет успешный исходный CI и идентичность
дерева, продвигает те же digest без пересборки. Production ещё не подготовлен:
нужны его values, Secrets, runner и GitHub environment protections.
Откат миграций в эту схему не включён.

Общие workflows закреплены тегом `delivery-v0.6.0` в `sellgar.infrastructure`.
Порядок установки runner и передачи управления: [доставка приложений](https://github.com/pyatakovvg/sellgar.infrastructure/blob/development/docs/application-delivery.md).
