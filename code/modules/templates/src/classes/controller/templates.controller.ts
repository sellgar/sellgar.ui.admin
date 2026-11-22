import { ProductTypeServiceInterface, ProductTypeResultEntity } from '@library/domain';
import { TemplateCreateRoute, TemplateModifyRoute } from '@library/route-tokens';
import { Collector, Controller, Inject, NavigateServiceInterface } from '@sellgar/app';

import { TemplatesControllerInterface } from './templates-controller.interface.ts';

const PAGE_LIMIT = 50;

@Controller()
export class TemplatesController implements TemplatesControllerInterface {
  constructor(
    @Inject(ProductTypeServiceInterface) private readonly productTypeService: ProductTypeServiceInterface,
    @Inject(NavigateServiceInterface) private readonly navigateService: NavigateServiceInterface,
    @Inject(Collector) private readonly collector: Collector<ProductTypeResultEntity, { nextToken: string | null }>,
  ) {}

  get hasMore(): boolean {
    return this.collector.state.get('nextToken') !== null;
  }

  async loader(): Promise<ProductTypeResultEntity> {
    const pages = await this.collector.execute(async (collection, state) => {
      const nextToken = state.get('nextToken');

      if (nextToken === null) return collection.append([]);

      const page = await this.productTypeService.findAll(PAGE_LIMIT, nextToken);

      state.set('nextToken', page.meta.nextToken);

      return collection.append([page]);
    });
    const items = new Map(pages.flatMap((page) => page.items).map((item) => [item.uuid, item]));

    return Object.assign(new ProductTypeResultEntity(), {
      items: [...items.values()],
      meta: pages[pages.length - 1].meta,
    });
  }

  create(): Promise<void> {
    return this.navigateService.to(TemplateCreateRoute);
  }

  open(uuid: string): Promise<void> {
    return this.navigateService.to(TemplateModifyRoute, { params: { uuid } });
  }
}
