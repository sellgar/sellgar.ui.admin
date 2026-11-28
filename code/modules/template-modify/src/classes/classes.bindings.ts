import { BindingModuleInterface, type BindingRegistryInterface } from '@sellgar/app';

import { TemplateModifyControllerInterface } from './controller/template-modify-controller.interface.ts';
import { TemplateModifyController } from './controller/template-modify.controller.ts';
import { PropertySearchControllerInterface } from './controller/property-search/property-search-controller.interface.ts';
import { PropertySearchController } from './controller/property-search/property-search.controller.ts';
import { PropertySearchStoreInterface } from './store/property-search/property-search-store.interface.ts';
import { PropertySearchStore } from './store/property-search/property-search.store.ts';

export class TemplateModifyBindings implements BindingModuleInterface {
  register(registry: BindingRegistryInterface): void {
    registry.bind(TemplateModifyControllerInterface).to(TemplateModifyController);
    registry.bind(PropertySearchControllerInterface).to(PropertySearchController).inSingletonScope();
    registry.bind(PropertySearchStoreInterface).to(PropertySearchStore);
  }
}
