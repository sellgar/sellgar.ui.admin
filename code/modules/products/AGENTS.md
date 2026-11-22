# AGENTS

## Зона ответственности

`@module/products` владеет route списка товаров.

## Правила

- Loader списка товаров, table и header держать здесь.
- Для edit переходить на `/products/:uuid`, для create - на `/products/create`.
- Экран списка использует геометрический срез `Table` из `@sellgar/kit/table`: внешний scroll owner, виртуализация и встроенная идентификация строк по объектам, без `data.getRowId`.
- Resize включён явно только у description через Column.resizable=true; brand является последней колонкой и не имеет ручки.
- Row click является primary open/edit action для product rows.
- Page.Filter повторяет механику магазинов: SearchController читает/изменяет
  `term` через RouteQueryServiceInterface, ProductController.loader передает
  этот параметр в ProductService.findAll. Поиск выполняется на сервере;
  введенный запрос восстанавливается из URL, сброс очищает term.

- Догрузка: module-scoped singleton Collector, порции по 50, nextToken до null. Table.lastRowTrigger запускает общий useRevalidate() модуля; loading показывает штатный прогресс. Ошибка не продвигает курсор и не удаляет накопленные данные.
- При изменении query-фильтра контроллер начинает новую коллекцию; страницы разных выборок не объединяются.
