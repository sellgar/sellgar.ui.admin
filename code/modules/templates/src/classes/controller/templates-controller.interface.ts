import type { ProductTypeResultEntity } from '@library/domain';

export abstract class TemplatesControllerInterface {
  abstract readonly hasMore: boolean;

  abstract loader(): Promise<ProductTypeResultEntity>;
  abstract create(): Promise<void>;
  abstract open(uuid: string): Promise<void>;
}
