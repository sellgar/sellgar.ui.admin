import { BindingModuleInterface, Collector, type BindingRegistryInterface } from '@sellgar/app';

import { ProductControllerInterface } from './controller/product/product-controller.interface.ts';
import { ProductController } from './controller/product/product.controller.ts';
import { SearchControllerInterface } from './controller/search/search-controller.interface.ts';
import { SearchController } from './controller/search/search.controller.ts';

export class ProductsBindings implements BindingModuleInterface {
  register(registry: BindingRegistryInterface): void {
    registry.bind(Collector).toSelf().inSingletonScope();
    registry.bind(ProductControllerInterface).to(ProductController);
    registry.bind(SearchControllerInterface).to(SearchController);
  }
}
