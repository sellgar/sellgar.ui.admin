import { Expose, Type } from 'class-transformer';
import { IsDefined, IsArray, ValidateNested } from 'class-validator';
import { EntityCollection } from '@sellgar/app';

import { MetaEntity } from '../../meta';
import { ProductSummaryEntity } from './product-summary.entity.ts';

@EntityCollection({ entity: ProductSummaryEntity, property: 'items' })
export class ProductResultEntity {
  @IsArray()
  @Expose()
  @ValidateNested({ each: true })
  @Type(() => ProductSummaryEntity)
  items: ProductSummaryEntity[];

  @Expose()
  @IsDefined()
  @ValidateNested()
  @Type(() => MetaEntity)
  meta: MetaEntity;
}
