import { type UnitEntity, type UnitServiceInterface } from '@library/domain';
import { describe, expect, it, vi } from 'vitest';

import { UnitListController } from '../unit-list.controller.ts';

describe('UnitListController', () => {
  it('возвращает размерности из результата предметного сервиса', async () => {
    const result = [] as UnitEntity[];
    const unitService = { getCatalogue: vi.fn().mockResolvedValue(result) } as unknown as UnitServiceInterface;
    const controller = new UnitListController(unitService);

    await expect(controller.loader()).resolves.toBe(result);
    expect(unitService.getCatalogue).toHaveBeenCalledOnce();
  });
});
