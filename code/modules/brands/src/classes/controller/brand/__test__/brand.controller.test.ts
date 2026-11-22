import { BrandResultEntity, type BrandServiceInterface, BrandEntity } from '@library/domain';
import { Collector, insertEntity } from '@sellgar/app';
import { describe, expect, it, vi } from 'vitest';

import { BrandController } from '../brand.controller.ts';

const page = (keys: string[], nextToken: string | null) =>
  Object.assign(new BrandResultEntity(), {
    items: keys.map((key) => Object.assign(new BrandEntity(), { code: key })),
    meta: { limit: 50, nextToken },
  });
const ids = (result: BrandResultEntity) => result.items.map((item) => item.code);

const setup = () => {
  const read = vi.fn();
  const service = { findAll: read } as unknown as BrandServiceInterface;
  const collector = new Collector<BrandResultEntity, { nextToken: string | null }>();
  return {
    controller: new BrandController(service, collector),
    read,
    collector,
  };
};

describe('BrandController cursor collection', () => {
  it('накапливает порции и передаёт nextToken следующему запросу', async () => {
    const f = setup();
    f.read.mockResolvedValueOnce(page(['first'], 'next')).mockResolvedValueOnce(page(['second'], null));
    expect(ids(await f.controller.loader())).toEqual(['first']);
    expect(f.controller.hasMore).toBe(true);
    expect(f.read).toHaveBeenNthCalledWith(1, 50, undefined);
    const result = await f.controller.loader();
    expect(ids(result)).toEqual(['first', 'second']);
    expect(result).toBeInstanceOf(BrandResultEntity);
    expect(result.meta).toEqual({ limit: 50, nextToken: null });
    expect(f.read).toHaveBeenLastCalledWith(50, 'next');
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
    expect(f.read.mock.calls.slice(1).map((args) => args[1])).toEqual(['next', 'next']);
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
    expect(f.read.mock.calls.map((args) => args[1])).toEqual([undefined, undefined]);
  });

  it('сохраняет созданную запись при следующей догрузке без дублей', async () => {
    const f = setup();
    f.read.mockResolvedValueOnce(page(['first'], 'next')).mockResolvedValueOnce(page(['second'], null));
    const first = await f.controller.loader();
    insertEntity(BrandEntity, Object.assign(new BrandEntity(), { code: 'brands-created' }));
    expect(ids(first)).toContain('brands-created');
    const second = await f.controller.loader();
    expect(ids(second)).toEqual(['first', 'brands-created', 'second']);
  });
});
