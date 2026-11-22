import { Expose, Type } from 'class-transformer';
import { IsDefined, IsArray, ValidateNested } from 'class-validator';
import { EntityCollection } from '@sellgar/app';

import { MetaEntity } from '../../meta';
import { StoreProductEntity } from './store-product.entity.ts';

@EntityCollection({ entity: StoreProductEntity, property: 'items' })
export class StoreProductResultEntity {
  @IsArray()
  @Expose()
  @ValidateNested({ each: true })
  @Type(() => StoreProductEntity)
  items: StoreProductEntity[];

  @Expose()
  @IsDefined()
  @ValidateNested()
  @Type(() => MetaEntity)
  meta: MetaEntity;
}
