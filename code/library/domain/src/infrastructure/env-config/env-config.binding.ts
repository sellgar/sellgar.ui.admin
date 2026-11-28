import type { BindingModuleInterface, BindingRegistryInterface } from '@sellgar/app';

import { EnvConfigInterface } from './env-config.interface.ts';
import { EnvConfig } from './env-config.ts';

export class EnvConfigBinding implements BindingModuleInterface {
  register(registry: BindingRegistryInterface): void {
    registry.bind(EnvConfigInterface).to(EnvConfig).inSingletonScope();
  }
}
