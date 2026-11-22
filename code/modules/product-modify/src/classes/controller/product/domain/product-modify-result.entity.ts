import { Expose, Type } from 'class-transformer';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { ProductEntity, ProductTypeEntity } from '@library/domain';

export class ProductModifyResultEntity {
  @Expose()
  @IsOptional()
  @ValidateNested()
  @Type(() => ProductEntity)
  product?: ProductEntity;

  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductTypeEntity)
  productTypes: ProductTypeEntity[];
}
