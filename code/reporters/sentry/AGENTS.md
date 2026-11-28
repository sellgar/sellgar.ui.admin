# Sentry Reporter

## Ответственность

- `SentryReporter` получает конфигурацию, преобразует application report через принадлежащий репортёру `SentryReportMapper` и передаёт готовую запись в `SentryClient.log(input)`.
- `SentryClient` инициализирует SDK, отправляет подготовленную запись и закрывает свой SDK-клиент через `dispose()`. Клиент не разбирает application/runtime reports и не содержит правил конкретных сценариев приложения.
- `SentryReportMapper` в `src/classes/mapper/sentry-report/` владеет преобразованием application/runtime reports и переданного framework-контекста в `SentryLogInput`: сообщение, ошибка, handled, user, contexts, дополнительные данные и tags.
- Ссылка на SDK-клиент принадлежит `SentryClient`. Reporter не хранит `active` и не создаёт параллельный lifecycle.
- Регистрация до композиции: `app.reporter([SentryReporter])`.
- Зависимости передаются через constructor injection и `@UseBindings(SentryBindings)`. Фабрика `configure()` и конфигурационные подклассы не нужны.

## Структура клиента

- `src/classes/client/sentry/sentry.client.ts` — реализация SDK-клиента.
- `sentry-client.interface.ts` — DI-контракт клиента.
- `input/sentry-initialize.input.ts` — входные параметры `initialize()`.
- `input/sentry-log.input.ts` — контракт подготовленной записи для `log()` без application/runtime report типов.
- `__test__/` — тесты клиента.
- `index.ts` — локальный фасад клиента. Потребители используют его, а не private paths.

Mapper репортёра и проверки преобразования находятся в
`src/classes/mapper/sentry-report/`, за пределами клиента.

## Преобразование причины ошибки

- `SentryReportMapper` собирает итоговую запись обычного отчёта или runtime failure. Ему принадлежит вложенный `SentryErrorMapper` в `src/classes/mapper/sentry-report/mapper/sentry-error/`.
- `SentryErrorMapper` сохраняет исходный `Error`, его стек и дополнительные поля; владеет обходом `cause` и `AggregateError.errors` и объединяет результаты дочерних преобразований. Повторного обхода причин для correlation tags нет.
- `ValidationMapper` в `mapper/validation/` error mapper распознаёт непустой `ValidationError[]` и формирует полные пути полей, имена target, значения с типами, тексты ограничений и их contexts. Сохраняются ограничения родителя и вложенных полей. Сводка строится из исходных ограничений независимо от формата сериализации и становится сообщением `ValidationError`; наличие валидации также отмечается tag `error_kind=validation`.
- `HttpCorrelationMapper` в `mapper/http-correlation/` error mapper преобразует backend ProblemDetails в проверенные correlation tags. Он не обходит причины и не обращается к SDK.
- `DiagnosticValueSerializer` в `serializer/diagnostic-value/` error mapper представляет произвольные значения плоскими скалярными полями, чтобы стандартная глубина нормализации SDK не заменяла содержимое на `[Object]`. Объектные значения полей валидации сохраняются как JSON с путями. `undefined`, `null`, пустая строка и нулевые значения различаются; accessors произвольных диагностических полей не вызываются.
- Для причин без исходного `Error` создаётся диагностическое исключение с понятным типом и сообщением. Стек берётся только из самой причины, стек маппера или доставки не выдаётся за место возникновения сбоя.
- Циклы и превышения ограничений диагностического обхода помечаются явно; они не должны приводить к потере всего события. Каждая вложенная unit имеет свой `index.ts`, потребители обращаются через этот фасад. Публичный API пакета остаётся ограничен `SentryReporter`.

Дерево владения подготовкой отчёта:

```text
mapper/sentry-report/
  sentry-report.mapper.ts
  mapper/sentry-error/
    sentry-error.mapper.ts
    mapper/
      validation/validation.mapper.ts
      http-correlation/http-correlation.mapper.ts
    serializer/
      diagnostic-value/diagnostic-value.serializer.ts
```

Error mapper использует оба дочерних mapper и serializer. Validation mapper
также использует serializer; обратных зависимостей нет. Тесты преобразований
находятся в `__test__/` соответствующих units.

## Конфигурация

- Reporter читает `VITE_USE_SENTRY`, `VITE_SENTRY_API` и `VITE_SENTRY_ENVIRONMENT` через существующий `ConfigInterface` из runtime `config.js`.
- Отсутствующая настройка включения или DSN не мешает запуску приложения; SDK не запускается без включения и непустого DSN.
- Локальный `config.js` содержит выключенную интеграцию и явно обозначенный DSN-заглушку на домене `.invalid`. Перед реальной отправкой нужны DSN проекта Sellgar и включение интеграции.
- `EnvConfigInterface` из `@library/domain` читает `import.meta.env`. Если при сборке переданы `VITE_APP_UI_VERSION` и `VITE_SENTRY_RELEASE`, reporter формирует release как `<version> (<release>)`; отсутствующие значения не превращаются в строку `undefined`.
- Репортёр не вычисляет версию из имени ветки. Vite/CI-настройки находятся вне пакета; перенос репортёра их не изменяет.
- Регистрация — `app.reporter([SentryReporter])` до `app.compose()` в bootstrap Admin.

## Отчёты

- `SentryReporter.report()` преобразует отчёт до обращения к клиенту. Mapper репортёра разделяет runtime failure и обычный application report; клиент получает готовую запись.
- Framework-контекст принимается как `ApplicationReporterContextInterface` и остаётся на стороне репортёра. Mapper читает `ProfileEntity` из `context.store` только для `authenticated` и копирует `user.uuid`, `user.login` в стандартный Sentry `user`. Если профиля нет либо фаза равна `anonymous`/`unknown`, передаётся `user: null`.
- Фаза и ревизия сессии сохраняются в `contexts.session`; tag `session_phase` позволяет искать события по `anonymous`, `authenticated` и `unknown`. Клиент только применяет подготовленный `user` к scope события и не знает о профиле, store или состоянии авторизации.
- Runtime failure становится error-событием с диагностикой причины, исходным report context и propagation metadata. `contexts.runtime` содержит operation и плоские поля owner/participant; propagation содержит плоские поля owner для каждого шага. Токены представлены доступными строковыми именами; имена функций могут быть минифицированы в production, source maps не восстанавливают такие строковые значения.
- Падение всего приложения (`application.failed`) помечается как unhandled; локализованные runtime failures остаются handled.
- `debug`, `info`, `warning` становятся breadcrumbs; `error` — событием.
- Если в цепочке `cause` события есть `HttpException`, mapper берёт из его ProblemDetails tag `otel_trace_id` (32 hex trace id из W3C `traceId`) и `correlation_id`: по ним ищутся строки логов BFF (`TraceId`, `CorrelationId`). Невалидные или пустые значения не попадают в tags.
- Console capture, tracing и Replay не подключаются. Автоматический сбор cookies, HTTP bodies/headers, query parameters, user information и stack locals отключён. Явно переданный report context является отдельными данными приложения.

## Проверка

- Целевые Vitest-тесты `reporters/sentry` и `library/domain/src/infrastructure/env-config`.
- Typecheck reporter и production build приложения.
