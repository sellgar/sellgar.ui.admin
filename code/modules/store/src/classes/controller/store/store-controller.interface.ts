import type { StoreProductResultEntity } from '@library/domain';

export abstract class StoreControllerInterface {
  abstract readonly hasMore: boolean;

  abstract loader(): Promise<StoreProductResultEntity>;
}
