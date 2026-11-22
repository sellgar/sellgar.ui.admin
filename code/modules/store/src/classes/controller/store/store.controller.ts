import { StoreServiceInterface, StoreProductResultEntity } from '@library/domain';

import { Collector, Controller, Inject, RouteQueryServiceInterface } from '@sellgar/app';

import { FilterQuery } from '../filter/query/filter.query.ts';
import { StoreControllerInterface } from './store-controller.interface.ts';

const PAGE_LIMIT = 50;

@Controller()
export class StoreController implements StoreControllerInterface {
  constructor(
    @Inject(StoreServiceInterface) private readonly storeService: StoreServiceInterface,
    @Inject(RouteQueryServiceInterface) private readonly query: RouteQueryServiceInterface,
    @Inject(Collector)
    private readonly collector: Collector<StoreProductResultEntity, { nextToken: string | null; queryKey: string }>,
  ) {}

  get hasMore(): boolean {
    return this.collector.state.get('nextToken') !== null;
  }

  async loader(): Promise<StoreProductResultEntity> {
    const filter = this.query.get(FilterQuery);
    const queryKey = JSON.stringify(filter);
    const previousQueryKey = this.collector.state.get('queryKey');

    if (previousQueryKey !== undefined && previousQueryKey !== queryKey) this.collector.reset();

    const pages = await this.collector.execute(async (collection, state) => {
      const nextToken = state.get('nextToken');

      if (nextToken === null) return collection.append([]);

      const page = await this.storeService.getAll({ ...filter, limit: PAGE_LIMIT, nextToken });

      state.set('nextToken', page.meta.nextToken);
      state.set('queryKey', queryKey);

      return collection.append([page]);
    });
    const items = new Map(pages.flatMap((page) => page.items).map((item) => [item.uuid, item]));

    return Object.assign(new StoreProductResultEntity(), {
      items: [...items.values()],
      meta: pages[pages.length - 1].meta,
    });
  }
}
