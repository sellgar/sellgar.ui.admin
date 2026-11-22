import { Collector, Controller, Inject } from '@sellgar/app';

import { CartServiceInterface, CartResultEntity } from '@library/domain';

import { CartControllerInterface } from './cart-controller.interface.ts';

const PAGE_LIMIT = 50;

@Controller()
export class CartController implements CartControllerInterface {
  constructor(
    @Inject(CartServiceInterface) private readonly carts: CartServiceInterface,
    @Inject(Collector) private readonly collector: Collector<CartResultEntity, { nextToken: string | null }>,
  ) {}

  get hasMore(): boolean {
    return this.collector.state.get('nextToken') !== null;
  }

  async loader(): Promise<CartResultEntity> {
    const pages = await this.collector.execute(async (collection, state) => {
      const nextToken = state.get('nextToken');

      if (nextToken === null) return collection.append([]);

      const page = await this.carts.getAll({ limit: PAGE_LIMIT, nextToken });

      state.set('nextToken', page.meta.nextToken);

      return collection.append([page]);
    });
    const items = new Map(pages.flatMap((page) => page.items).map((item) => [item.uuid, item]));

    return Object.assign(new CartResultEntity(), {
      items: [...items.values()],
      meta: pages[pages.length - 1].meta,
    });
  }
}
