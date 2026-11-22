import type { UnitResultEntity } from '@library/domain';

export abstract class UnitControllerInterface {
  abstract readonly hasMore: boolean;

  abstract loader(): Promise<UnitResultEntity>;
}
