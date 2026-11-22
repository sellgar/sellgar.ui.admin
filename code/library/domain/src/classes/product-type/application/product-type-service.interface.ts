import { ProductTypeEntity } from '../domain/product-type.entity.ts';
import { ProductTypeResultEntity } from '../domain/product-type-result.entity.ts';
import type { CreateProductTypeInput } from '../data/gateway/input/create-product-type.input.ts';
import type { UpdateProductTypeInput } from '../data/gateway/input/update-product-type.input.ts';

export abstract class ProductTypeServiceInterface {
  abstract getCatalogue(): Promise<ProductTypeEntity[]>;
  abstract findAll(limit?: number, nextToken?: string): Promise<ProductTypeResultEntity>;
  abstract findByUuid(uuid: string): Promise<ProductTypeEntity>;
  abstract create(input: CreateProductTypeInput): Promise<ProductTypeEntity>;
  abstract update(uuid: string, input: UpdateProductTypeInput): Promise<ProductTypeEntity>;
}
