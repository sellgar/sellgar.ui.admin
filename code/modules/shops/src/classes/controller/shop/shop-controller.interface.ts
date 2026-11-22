import type { ShopResultEntity } from '@library/domain';

export abstract class ShopControllerInterface {
  abstract readonly hasMore: boolean;

  abstract loader(): Promise<ShopResultEntity>;
}
