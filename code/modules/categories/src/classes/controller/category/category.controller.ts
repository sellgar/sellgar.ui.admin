import { CategoryServiceInterface, ShopServiceInterface } from '@library/domain';
import { Controller, Inject, RouteQueryServiceInterface } from '@sellgar/app';

import type { CategoryControllerInterface } from './category-controller.interface.ts';
import type { CategoryPageEntity } from './domain/category-page.entity.ts';
import { CategoryQuery } from './query/category.query.ts';

@Controller()
export class CategoryController implements CategoryControllerInterface {
  constructor(
    @Inject(CategoryServiceInterface) private readonly categories: CategoryServiceInterface,
    @Inject(ShopServiceInterface) private readonly shops: ShopServiceInterface,
    @Inject(RouteQueryServiceInterface) private readonly query: RouteQueryServiceInterface,
  ) {}

  async loader(): Promise<CategoryPageEntity> {
    const shops = await this.shops.getCatalogue();

    const shopUuid = this.query.get(CategoryQuery).shopUuid ?? shops[0]?.uuid;
    const tree = shopUuid ? await this.categories.getTree(shopUuid) : null;
    return { shops, tree };
  }

  action({ payload }: Parameters<CategoryControllerInterface['action']>[0]) {
    return this.query.set(CategoryQuery, { shopUuid: payload.shopUuid });
  }
}
