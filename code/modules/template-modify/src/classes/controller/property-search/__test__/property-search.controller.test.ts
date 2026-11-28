import type { PropertyEntity, PropertyResultEntity, PropertyServiceInterface } from '@library/domain';
import { describe, expect, it, vi } from 'vitest';

import { PropertySearchController } from '../property-search.controller.ts';
import { PropertySearchStore } from '../../../store/property-search/property-search.store.ts';

const property = (code: string) => ({ code, name: code }) as PropertyEntity;
const page = (items: PropertyEntity[], nextToken: string | null = null): PropertyResultEntity => ({
  items,
  meta: { limit: 20, nextToken },
});
const fixture = () => {
  const findAll = vi.fn<PropertyServiceInterface['findAll']>();
  const controller = new PropertySearchController(
    { findAll } as unknown as PropertyServiceInterface,
    new PropertySearchStore(),
  );
  return { controller, findAll };
};

describe('Property search', () => {
  it('does not download the dictionary without a search and normalizes typed text', async () => {
    const { controller, findAll } = fixture();
    await controller.search(' ');
    expect(findAll).not.toHaveBeenCalled();
    findAll.mockResolvedValue(page([property('material')]));

    await controller.search(' матер ');

    expect(findAll).toHaveBeenCalledWith(20, undefined, 'матер');
    expect(controller.options.map((item) => item.code)).toEqual(['material']);
  });

  it('appends the next cursor page only once and stops at the end', async () => {
    const { controller, findAll } = fixture();
    findAll.mockResolvedValueOnce(page([property('one')], 'next'));
    await controller.search('матер');
    let resolve!: (result: PropertyResultEntity) => void;
    findAll.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );

    const next = controller.loadNext();
    await controller.loadNext();
    expect(controller.loadingMore).toBe(true);
    expect(controller.options.map((item) => item.code)).toEqual(['one']);
    expect(findAll).toHaveBeenLastCalledWith(20, 'next', 'матер');
    resolve(page([property('two')]));
    await next;
    await controller.loadNext();

    expect(findAll).toHaveBeenCalledTimes(2);
    expect(controller.options.map((item) => item.code)).toEqual(['one', 'two']);
    expect(controller.loadingMore).toBe(false);
  });

  it('ignores an old page after changing the search or closing the popup', async () => {
    const { controller, findAll } = fixture();
    const pending: ((result: PropertyResultEntity) => void)[] = [];
    findAll.mockImplementation(() => new Promise((resolve) => pending.push(resolve)));
    const old = controller.search('матер');
    const current = controller.search('цвет');
    pending[1](page([property('color')]));
    await current;
    pending[0](page([property('material')]));
    await old;
    expect(controller.options.map((item) => item.code)).toEqual(['color']);

    const closing = controller.search('масса');
    controller.reset();
    pending[2](page([property('weight')]));
    await closing;
    expect(controller.options).toEqual([]);
    expect(controller.loading).toBe(false);
  });

  it('retains selected property data across search results and resets', async () => {
    const { controller, findAll } = fixture();
    const chosen = property('material');
    controller.remember(chosen);
    findAll.mockResolvedValue(page([property('color')]));
    await controller.search('цвет');
    controller.reset();

    expect(controller.getSelected('material')).toBe(chosen);
    expect(controller.options).toEqual([]);
  });

  it('exposes request failures and discards results after disposal', async () => {
    const { controller, findAll } = fixture();
    findAll.mockRejectedValueOnce(new Error('network'));
    await controller.search('матер');
    expect(controller.error).toContain('Повторите поиск');
    expect(controller.loading).toBe(false);

    let resolve!: (result: PropertyResultEntity) => void;
    findAll.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const pending = controller.search('цвет');
    controller.dispose();
    resolve(page([property('color')]));
    await pending;
    await controller.search('масса');
    expect(controller.options).toEqual([]);
    expect(findAll).toHaveBeenCalledTimes(2);
  });
});
