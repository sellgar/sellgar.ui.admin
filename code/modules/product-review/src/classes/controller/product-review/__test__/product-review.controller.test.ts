import { expect, it, vi } from 'vitest';
import type { ProductEntity, ProductServiceInterface } from '@library/domain';
import { ProductsRoute } from '@library/route-tokens';
import type { NavigateServiceInterface, UserRequestServiceInterface } from '@sellgar/app';

import { ProductReviewController } from '../product-review.controller.ts';

const product = { uuid: 'ae1e00f1-bbb2-4b88-b214-85e01c79ab17', version: 9 } as ProductEntity;

const fixture = (shopCount: number, confirmed: boolean) => {
  const products = {
    archiveImpact: vi.fn().mockResolvedValue({ offerCount: 0, shopCount }),
    archive: vi.fn().mockResolvedValue(product),
  } as unknown as ProductServiceInterface;
  const navigate = { to: vi.fn() } as unknown as NavigateServiceInterface;
  const requests = { confirm: vi.fn().mockResolvedValue(confirmed) } as unknown as UserRequestServiceInterface;
  const controller = new ProductReviewController(products, navigate, requests);
  const archive = () => controller.action({ payload: product, request: new Request('http://localhost/product') });
  return { products, navigate, requests, archive };
};

it.each([0, 2])('requires confirmation with %s related shops and respects cancellation', async (shopCount) => {
  const { archive, products, navigate, requests } = fixture(shopCount, false);
  await archive();
  expect(products.archiveImpact).toHaveBeenCalledExactlyOnceWith(product.uuid);
  expect(requests.confirm).toHaveBeenCalledOnce();
  const request = vi.mocked(requests.confirm).mock.calls[0][0];
  expect(request.description).toContain(shopCount ? 'Связанные размещения' : 'Связанных продаж нет');
  expect(products.archive).not.toHaveBeenCalled();
  expect(navigate.to).not.toHaveBeenCalled();
});

it('archives after confirmation and returns to the ordinary product list', async () => {
  const { archive, products, navigate } = fixture(2, true);
  await archive();
  expect(products.archive).toHaveBeenCalledExactlyOnceWith(product.uuid, product.version);
  expect(navigate.to).toHaveBeenCalledExactlyOnceWith(ProductsRoute);
});

it('does not archive if Store usage cannot be checked', async () => {
  const { archive, products, requests } = fixture(0, true);
  const error = new Error('Store is unavailable');
  vi.mocked(products.archiveImpact).mockRejectedValue(error);
  await expect(archive()).rejects.toBe(error);
  expect(requests.confirm).not.toHaveBeenCalled();
  expect(products.archive).not.toHaveBeenCalled();
});

it('keeps the review open if archive delivery fails', async () => {
  const { archive, products, navigate } = fixture(1, true);
  const error = new Error('Store did not acknowledge');
  vi.mocked(products.archive).mockRejectedValue(error);
  await expect(archive()).rejects.toBe(error);
  expect(navigate.to).not.toHaveBeenCalled();
});
