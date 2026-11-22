import { Expose, Type } from 'class-transformer';
import { IsDefined, IsArray, ValidateNested } from 'class-validator';

import { MetaEntity } from '../../meta';
import { ProductTypeEntity } from './product-type.entity.ts';

export class ProductTypeResultEntity {
  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductTypeEntity)
  items: ProductTypeEntity[];

  @Expose()
  @IsDefined()
  @ValidateNested()
  @Type(() => MetaEntity)
  meta: MetaEntity;
}
