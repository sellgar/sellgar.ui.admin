import type { BrandEntity } from '@library/domain';

export abstract class BrandOptionsControllerInterface {
  abstract loader(): Promise<BrandEntity[]>;
}
