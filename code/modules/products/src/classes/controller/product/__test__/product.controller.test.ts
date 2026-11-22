import { ProductResultEntity, type ProductServiceInterface } from '@library/domain';
import { ProductCreateRoute, ProductReviewRoute } from '@library/route-tokens';
import { Collector, type RouteQueryServiceInterface, type NavigateServiceInterface } from '@sellgar/app';
import { describe, expect, it, vi } from 'vitest';

import { ProductController } from '../product.controller.ts';

type Item = ProductResultEntity['items'][number];

const page = (keys: string[], nextToken: string | null) =>
  Object.assign(new ProductResultEntity(), {
    items: keys.map((key) => ({ uuid: key }) as Item),
    meta: { limit: 50, nextToken },
  });
const ids = (result: ProductResultEntity) => result.items.map((item) => item.uuid);

const setup = () => {
  const read = vi.fn();
  const service = { findAll: read } as unknown as ProductServiceInterface;
  const collector = new Collector<ProductResultEntity, { nextToken: string | null; queryKey: string }>();
  const get = vi.fn(() => ({}));
  const query = { get } as unknown as RouteQueryServiceInterface;
  const to = vi.fn().mockResolvedValue(undefined);
  const navigate = { to } as unknown as NavigateServiceInterface;
  return {
    controller: new ProductController(service, navigate, query, collector),
    read,
    collector,
    get,
    to,
  };
};

describe('ProductController cursor collection', () => {
  it('накапливает порции и передаёт nextToken следующему запросу', async () => {
    const f = setup();
    f.read.mockResolvedValueOnce(page(['first'], 'next')).mockResolvedValueOnce(page(['second'], null));
    expect(ids(await f.controller.loader())).toEqual(['first']);
    expect(f.controller.hasMore).toBe(true);
    expect(f.read).toHaveBeenNthCalledWith(1, { limit: 50, nextToken: undefined });
    const result = await f.controller.loader();
    expect(ids(result)).toEqual(['first', 'second']);
    expect(result).toBeInstanceOf(ProductResultEntity);
    expect(result.meta).toEqual({ limit: 50, nextToken: null });
    expect(f.read).toHaveBeenLastCalledWith({ limit: 50, nextToken: 'next' });
    expect(f.controller.hasMore).toBe(false);
  });

  it('не запрашивает страницу после nextToken=null', async () => {
    const f = setup();
    f.read.mockResolvedValue(page(['only'], null));
    await f.controller.loader();
    expect(ids(await f.controller.loader())).toEqual(['only']);
    expect(f.read).toHaveBeenCalledOnce();
  });

  it('продолжает после пустой порции, если сервер вернул токен', async () => {
    const f = setup();
    f.read.mockResolvedValueOnce(page([], 'next')).mockResolvedValueOnce(page(['last'], null));
    expect(ids(await f.controller.loader())).toEqual([]);
    expect(f.controller.hasMore).toBe(true);
    expect(ids(await f.controller.loader())).toEqual(['last']);
  });

  it('сохраняет курсор и накопленные строки при ошибке догрузки', async () => {
    const f = setup();
    const failure = new Error('unavailable');
    f.read
      .mockResolvedValueOnce(page(['first'], 'next'))
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce(page(['second'], null));
    await f.controller.loader();
    await expect(f.controller.loader()).rejects.toBe(failure);
    expect(f.controller.hasMore).toBe(true);
    expect(ids(await f.controller.loader())).toEqual(['first', 'second']);
    expect(f.read.mock.calls.slice(1).map((args) => args[0].nextToken)).toEqual(['next', 'next']);
  });

  it('не дублирует сущность на границе страниц', async () => {
    const f = setup();
    f.read.mockResolvedValueOnce(page(['same'], 'next')).mockResolvedValueOnce(page(['same', 'last'], null));
    await f.controller.loader();
    expect(ids(await f.controller.loader())).toEqual(['same', 'last']);
  });

  it('объединяет одновременные запросы одной порции', async () => {
    const f = setup();
    f.read.mockResolvedValue(page(['only'], 'next'));
    const [first, second] = await Promise.all([f.controller.loader(), f.controller.loader()]);
    expect(ids(first)).toEqual(['only']);
    expect(ids(second)).toEqual(['only']);
    expect(f.read).toHaveBeenCalledOnce();
  });

  it('после reset начинает с первой порции', async () => {
    const f = setup();
    f.read.mockResolvedValueOnce(page(['old'], 'next')).mockResolvedValueOnce(page(['fresh'], null));
    await f.controller.loader();
    f.collector.reset();
    expect(ids(await f.controller.loader())).toEqual(['fresh']);
    expect(f.read.mock.calls.map((args) => args[0].nextToken)).toEqual([undefined, undefined]);
  });

  it('начинает новую выборку при изменении фильтра и возвращении к прежнему', async () => {
    const f = setup();
    f.read
      .mockResolvedValueOnce(page(['old'], 'next'))
      .mockResolvedValueOnce(page(['changed'], null))
      .mockResolvedValueOnce(page(['restored'], null));
    f.get.mockReturnValue({ term: 'old' });
    await f.controller.loader();
    f.get.mockReturnValue({ term: 'changed' });
    expect(ids(await f.controller.loader())).toEqual(['changed']);
    f.get.mockReturnValue({ term: 'old' });
    expect(ids(await f.controller.loader())).toEqual(['restored']);
    expect(f.read.mock.calls.map((args) => args[0].nextToken)).toEqual([undefined, undefined, undefined]);
  });

  it('открывает создание и выбранную запись', async () => {
    const f = setup();
    await f.controller.create();
    expect(f.to).toHaveBeenCalledWith(ProductCreateRoute);
    await f.controller.open('selected');
    expect(f.to).toHaveBeenLastCalledWith(ProductReviewRoute, { params: { uuid: 'selected' } });
  });
});
