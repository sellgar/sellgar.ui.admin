import { SocketIOBindings } from '@library/socket-io';
import {
  Inject,
  Provider,
  type ProviderInterface,
  type ProviderResult,
  RevalidateServiceInterface,
  UseBindings,
} from '@sellgar/app';

import { StoreOfferChangesBindings } from './classes/classes.bindings.ts';
import { StoreOfferChangesHubInterface } from './classes/hub/store-offer-changes-hub.interface.ts';

@UseBindings(SocketIOBindings, StoreOfferChangesBindings)
@Provider({ lifetime: 'application' })
export class StoreOfferChangesProvider implements ProviderInterface {
  constructor(
    @Inject(StoreOfferChangesHubInterface)
    private readonly hub: StoreOfferChangesHubInterface,
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
