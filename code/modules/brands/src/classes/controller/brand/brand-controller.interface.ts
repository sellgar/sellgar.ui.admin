import type { BrandResultEntity } from '@library/domain';

export abstract class BrandControllerInterface {
  abstract readonly hasMore: boolean;

  abstract loader(): Promise<BrandResultEntity>;
}
