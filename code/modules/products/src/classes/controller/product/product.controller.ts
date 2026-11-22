import { ProductServiceInterface, ProductResultEntity } from '@library/domain';
import { ProductCreateRoute, ProductReviewRoute } from '@library/route-tokens';

import { Collector, Controller, Inject, NavigateServiceInterface, RouteQueryServiceInterface } from '@sellgar/app';

import { ProductControllerInterface } from './product-controller.interface.ts';
import { FilterQuery } from './query/filter.query.ts';

const PAGE_LIMIT = 50;

@Controller()
export class ProductController implements ProductControllerInterface {
  constructor(
    @Inject(ProductServiceInterface) private readonly productService: ProductServiceInterface,
    @Inject(NavigateServiceInterface) private readonly navigateService: NavigateServiceInterface,
    @Inject(RouteQueryServiceInterface) private readonly query: RouteQueryServiceInterface,
    @Inject(Collector)
    private readonly collector: Collector<ProductResultEntity, { nextToken: string | null; queryKey: string }>,
  ) {}

  get hasMore(): boolean {
    return this.collector.state.get('nextToken') !== null;
  }

  async loader(): Promise<ProductResultEntity> {
    const filter = this.query.get(FilterQuery);
    const queryKey = JSON.stringify(filter);
    const previousQueryKey = this.collector.state.get('queryKey');

    if (previousQueryKey !== undefined && previousQueryKey !== queryKey) this.collector.reset();

    const pages = await this.collector.execute(async (collection, state) => {
      const nextToken = state.get('nextToken');

      if (nextToken === null) return collection.append([]);

      const page = await this.productService.findAll({ ...filter, limit: PAGE_LIMIT, nextToken });

      state.set('nextToken', page.meta.nextToken);
      state.set('queryKey', queryKey);

      return collection.append([page]);
    });
    const items = new Map(pages.flatMap((page) => page.items).map((item) => [item.uuid, item]));

    return Object.assign(new ProductResultEntity(), {
      items: [...items.values()],
      meta: pages[pages.length - 1].meta,
    });
  }

  create(): Promise<void> {
    return this.navigateService.to(ProductCreateRoute);
  }

  open(uuid: string): Promise<void> {
    return this.navigateService.to(ProductReviewRoute, { params: { uuid } });
  }
}
