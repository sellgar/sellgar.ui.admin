import { ProductServiceInterface } from '@library/domain';
import { ProductVariantModifyRoute } from '@library/route-tokens';
import {
  Controller,
  Inject,
  NavigateServiceInterface,
  RevalidateServiceInterface,
  UserRequestServiceInterface,
} from '@sellgar/app';
import { VariantReviewControllerInterface } from './variant-review-controller.interface.ts';

@Controller()
export class VariantReviewController implements VariantReviewControllerInterface {
  constructor(
    @Inject(ProductServiceInterface) private readonly products: ProductServiceInterface,
    @Inject(NavigateServiceInterface) private readonly navigate: NavigateServiceInterface,
    @Inject(UserRequestServiceInterface) private readonly requests: UserRequestServiceInterface,
    @Inject(RevalidateServiceInterface) private readonly revalidate: RevalidateServiceInterface,
  ) {}

  loader(args: Parameters<VariantReviewControllerInterface['loader']>[0]) {
    return this.products.findVariant(args.params.productUuid, args.params.variantUuid);
  }

  edit(productUuid: string, variantUuid: string) {
    return this.navigate.to(ProductVariantModifyRoute, { params: { productUuid, variantUuid }, revalidate: false });
  }

  async action(args: Parameters<VariantReviewControllerInterface['action']>[0]) {
    const { productUuid, version, uuid, status } = args.payload;
    if (status === 'archived') {
      await this.products.restoreVariant(productUuid, uuid, version);
    } else {
      const impact = await this.products.archiveImpact(productUuid, uuid);
      const confirmed = await this.requests.confirm({
        title: 'Архивировать вариант?',
        description:
          impact.offerCount > 0
            ? `Связанные предложения: ${impact.offerCount}, магазины: ${impact.shopCount}. Они тоже будут архивированы и исчезнут с витрины. Позиции корзин станут недоступны.`
            : 'Вариант исчезнет из обычных списков. Связанных продаж нет.',
        status: 'destructive',
        applyText: 'Архивировать',
        cancelText: 'Отмена',
      });
      if (!confirmed) return;
      await this.products.archiveVariant(productUuid, uuid, version);
    }
    await this.navigate.close();
    await this.revalidate.revalidate();
  }
}
