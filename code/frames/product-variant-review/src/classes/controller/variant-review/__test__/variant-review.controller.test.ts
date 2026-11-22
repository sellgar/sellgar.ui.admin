import { describe, expect, it, vi } from 'vitest';
import type { ProductEntity, ProductVariantDetailEntity, ProductServiceInterface } from '@library/domain';
import type { NavigateServiceInterface, UserRequestServiceInterface, RevalidateServiceInterface } from '@sellgar/app';
import { VariantReviewController } from '../variant-review.controller.ts';

const productUuid = 'ae1e00f1-bbb2-4b88-b214-85e01c79ab17';
const variantUuid = 'a73b1ba5-d85b-4789-a017-ff8671df79bd';

it.each(['active', 'archived'] as const)('changes only the selected variant status from %s', async (status) => {
  const products = {
    archiveVariant: vi.fn(),
    restoreVariant: vi.fn(),
    archiveImpact: vi.fn().mockResolvedValue({ offerCount: 0, shopCount: 0 }),
  } as unknown as ProductServiceInterface;
  const navigate = { close: vi.fn() } as unknown as NavigateServiceInterface;
  const method = status === 'active' ? products.archiveVariant : products.restoreVariant;
  vi.mocked(method).mockResolvedValue({ uuid: productUuid } as ProductEntity);
  const requests = { confirm: vi.fn().mockResolvedValue(true) } as unknown as UserRequestServiceInterface;
  const revalidate = { revalidate: vi.fn() } as unknown as RevalidateServiceInterface;
  const controller = new VariantReviewController(products, navigate, requests, revalidate);
  await controller.action({
    payload: { productUuid, uuid: variantUuid, version: 9, status } as ProductVariantDetailEntity,
    request: new Request('http://localhost/variant'),
  });
  expect(method).toHaveBeenCalledExactlyOnceWith(productUuid, variantUuid, 9);
  expect(navigate.close).toHaveBeenCalledOnce();
  expect(requests.confirm).toHaveBeenCalledTimes(status === 'active' ? 1 : 0);
});

it.each([0, 3])(
  'always confirms archive, warns about %s sales and does nothing after cancellation',
  async (offerCount) => {
    const products = {
      archiveImpact: vi.fn().mockResolvedValue({ offerCount, shopCount: offerCount ? 2 : 0 }),
      archiveVariant: vi.fn(),
    } as unknown as ProductServiceInterface;
    const navigate = { close: vi.fn() } as unknown as NavigateServiceInterface;
    const requests = { confirm: vi.fn().mockResolvedValue(false) } as unknown as UserRequestServiceInterface;
    const revalidate = { revalidate: vi.fn() } as unknown as RevalidateServiceInterface;
    const controller = new VariantReviewController(products, navigate, requests, revalidate);
    await controller.action({
      payload: { productUuid, uuid: variantUuid, version: 9, status: 'active' } as ProductVariantDetailEntity,
      request: new Request('http://localhost/variant'),
    });
    expect(products.archiveImpact).toHaveBeenCalledWith(productUuid, variantUuid);
    expect(requests.confirm).toHaveBeenCalledOnce();
    expect(products.archiveVariant).not.toHaveBeenCalled();
    expect(navigate.close).not.toHaveBeenCalled();
    expect(revalidate.revalidate).not.toHaveBeenCalled();
  },
);
