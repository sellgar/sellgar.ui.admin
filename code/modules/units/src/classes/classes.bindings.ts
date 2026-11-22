import { BindingModuleInterface, Collector, type BindingRegistryInterface } from '@sellgar/app';

import { UnitControllerInterface } from './controller/unit/unit-controller.interface.ts';
import { UnitController } from './controller/unit/unit.controller.ts';

export class UnitsBindings implements BindingModuleInterface {
  register(registry: BindingRegistryInterface): void {
    registry.bind(Collector).toSelf().inSingletonScope();
    registry.bind(UnitControllerInterface).to(UnitController);
  }
}
