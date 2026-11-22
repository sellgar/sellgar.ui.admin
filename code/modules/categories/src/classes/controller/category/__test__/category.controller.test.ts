import type { CategoryServiceInterface, ShopServiceInterface } from '@library/domain';
import type { RouteQueryServiceInterface } from '@sellgar/app';
import { describe, expect, it, vi } from 'vitest';

import { CategoryController } from '../category.controller.ts';
import { CategoryQuery } from '../query/category.query.ts';

const createFixture = (shopUuid?: string) => {
  const categories = { getTree: vi.fn().mockResolvedValue({ shopUuid: shopUuid ?? 'first', nodes: [] }) };
  const shops = {
    getCatalogue: vi.fn().mockResolvedValue([{ uuid: 'first', name: 'Первый' }]),
  };
  const query = { get: vi.fn().mockReturnValue({ shopUuid }), set: vi.fn().mockResolvedValue(undefined) };
  const controller = new CategoryController(
    categories as unknown as CategoryServiceInterface,
    shops as unknown as ShopServiceInterface,
    query as unknown as RouteQueryServiceInterface,
  );
  return { categories, shops, query, controller };
};

describe('CategoryController', () => {
  it('opens the first shop when no shop is selected', async () => {
    const fixture = createFixture();
    const result = await fixture.controller.loader();
    expect(fixture.categories.getTree).toHaveBeenCalledWith('first');
    expect(result.tree).toEqual({ shopUuid: 'first', nodes: [] });
  });

  it('loads the selected shop rather than combining shops', async () => {
    const fixture = createFixture('second');
    await fixture.controller.loader();
    expect(fixture.categories.getTree).toHaveBeenCalledWith('second');
  });

  it('keeps every shop returned for the selector', async () => {
    const fixture = createFixture();
    fixture.shops.getCatalogue.mockResolvedValue([
      { uuid: 'first', name: 'Первый' },
      { uuid: 'second', name: 'Второй' },
    ]);
    expect((await fixture.controller.loader()).shops).toHaveLength(2);
  });

  it('does not request a tree when there are no shops', async () => {
    const fixture = createFixture();
    fixture.shops.getCatalogue.mockResolvedValue([]);
    await expect(fixture.controller.loader()).resolves.toEqual({ shops: [], tree: null });
    expect(fixture.categories.getTree).not.toHaveBeenCalled();
  });

  it('changes the selected shop through the module query', async () => {
    const fixture = createFixture();
    await fixture.controller.action({ payload: { shopUuid: 'second' }, signal: new AbortController().signal });
    expect(fixture.query.set).toHaveBeenCalledWith(CategoryQuery, { shopUuid: 'second' });
  });

  it('preserves a backend failure instead of substituting example categories', async () => {
    const fixture = createFixture();
    const error = new Error('Store unavailable');
    fixture.categories.getTree.mockRejectedValue(error);
    await expect(fixture.controller.loader()).rejects.toBe(error);
  });
});
