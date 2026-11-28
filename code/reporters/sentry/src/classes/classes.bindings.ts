import type { BindingModuleInterface, BindingRegistryInterface } from '@sellgar/app';

import { SentryClient, SentryClientInterface } from './client/sentry';

export class SentryBindings implements BindingModuleInterface {
  register(registry: BindingRegistryInterface): void {
    registry.bind(SentryClientInterface).to(SentryClient).inSingletonScope();
  }
}
