import { SocketIOBindings } from '@library/socket-io';
import {
  Inject,
  Provider,
  type ProviderInterface,
  type ProviderResult,
  RevalidateServiceInterface,
  UseBindings,
} from '@sellgar/app';

import { ProductChangesBindings } from './classes/classes.bindings.ts';
import { ProductChangesHubInterface } from './classes/hub/product-changes-hub.interface.ts';

@UseBindings(SocketIOBindings, ProductChangesBindings)
@Provider({ lifetime: 'application' })
export class ProductChangesProvider implements ProviderInterface {
  constructor(
    @Inject(ProductChangesHubInterface)
    private readonly hub: ProductChangesHubInterface,
    @Inject(RevalidateServiceInterface) private readonly revalidateService: RevalidateServiceInterface,
  ) {}

  activate(): ProviderResult {
    return this.hub.subscribe({
      created: () => this.revalidateService.revalidate(),
      updated: () => this.revalidateService.revalidate(),
    });
  }

  dispose(): void {}
}
