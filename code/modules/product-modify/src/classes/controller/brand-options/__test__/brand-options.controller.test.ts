import { type BrandEntity, type BrandServiceInterface } from '@library/domain';
import { describe, expect, it, vi } from 'vitest';

import { BrandOptionsController } from '../brand-options.controller.ts';

describe('BrandOptionsController', () => {
  it('загружает бренды для формы', async () => {
    const result = [] as BrandEntity[];
    const brandService = { getCatalogue: vi.fn().mockResolvedValue(result) } as unknown as BrandServiceInterface;
    const controller = new BrandOptionsController(brandService);

    await expect(controller.loader()).resolves.toBe(result);
    expect(brandService.getCatalogue).toHaveBeenCalledOnce();
  });
});
