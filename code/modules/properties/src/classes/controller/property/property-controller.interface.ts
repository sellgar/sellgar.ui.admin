import type { PropertyResultEntity } from '@library/domain';

export abstract class PropertyControllerInterface {
  abstract readonly hasMore: boolean;

  abstract loader(): Promise<PropertyResultEntity>;
}
