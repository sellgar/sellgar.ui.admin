import type { CartResultEntity } from '@library/domain';

export abstract class CartControllerInterface {
  abstract readonly hasMore: boolean;

  abstract loader(): Promise<CartResultEntity>;
}
