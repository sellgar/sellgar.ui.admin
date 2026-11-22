import { UnitServiceInterface, UnitResultEntity } from '@library/domain';
import { Collector, Controller, Inject } from '@sellgar/app';

import { UnitControllerInterface } from './unit-controller.interface.ts';

const PAGE_LIMIT = 50;

@Controller()
export class UnitController implements UnitControllerInterface {
  constructor(
    @Inject(UnitServiceInterface) private readonly unitService: UnitServiceInterface,
    @Inject(Collector) private readonly collector: Collector<UnitResultEntity, { nextToken: string | null }>,
  ) {}

  get hasMore(): boolean {
    return this.collector.state.get('nextToken') !== null;
  }

  async loader(): Promise<UnitResultEntity> {
    const pages = await this.collector.execute(async (collection, state) => {
      const nextToken = state.get('nextToken');

      if (nextToken === null) return collection.append([]);

      const page = await this.unitService.findAll(PAGE_LIMIT, nextToken);

      state.set('nextToken', page.meta.nextToken);

      return collection.append([page]);
    });
    const items = new Map(pages.flatMap((page) => page.items).map((item) => [item.code, item]));

    return Object.assign(new UnitResultEntity(), {
      items: [...items.values()],
      meta: pages[pages.length - 1].meta,
    });
  }
}
