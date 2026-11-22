import { ProductServiceInterface } from '@library/domain';
import {
  ProductsRoute,
  ProductModifyRoute,
  ProductVariantCreateRoute,
  ProductVariantReviewRoute,
} from '@library/route-tokens';
import { Controller, Inject, NavigateServiceInterface, UserRequestServiceInterface } from '@sellgar/app';

import { ProductReviewControllerInterface } from './product-review-controller.interface.ts';

@Controller()
export class ProductReviewController implements ProductReviewControllerInterface {
  constructor(
    @Inject(ProductServiceInterface) private readonly products: ProductServiceInterface,
    @Inject(NavigateServiceInterface) private readonly navigate: NavigateServiceInterface,
    @Inject(UserRequestServiceInterface) private readonly requests: UserRequestServiceInterface,
  ) {}

  async action(args: Parameters<ProductReviewControllerInterface['action']>[0]): Promise<void> {
    const { uuid, version } = args.payload;
    const impact = await this.products.archiveImpact(uuid);
    const confirmed = await this.requests.confirm({
      title: 'Архивировать товар?',
      description:
        impact.shopCount > 0
          ? `Товар используется в ${impact.shopCount} магазинах. Связанные размещения и продажи всех вариантов будут архивированы. Позиции корзин станут недоступны.`
          : 'Товар и его варианты исчезнут из обычных списков. Связанных продаж нет.',
      status: 'destructive',
      applyText: 'Архивировать',
      cancelText: 'Отмена',
    });
    if (!confirmed) return;
    await this.products.archive(uuid, version);
    await this.navigate.to(ProductsRoute);
  }

  loader(args: Parameters<ProductReviewControllerInterface['loader']>[0]) {
    return this.products.findByUuid(args.params.uuid);
  }

  edit(uuid: string) {
    return this.navigate.to(ProductModifyRoute, { params: { uuid } });
  }

  createVariant(productUuid: string) {
    return this.navigate.to(ProductVariantCreateRoute, { params: { productUuid }, revalidate: false });
  }

  openVariant(productUuid: string, variantUuid: string) {
    return this.navigate.to(ProductVariantReviewRoute, { params: { productUuid, variantUuid }, revalidate: false });
  }
}
