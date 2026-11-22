import { Expose, Type } from 'class-transformer';
import { EntityCollection } from '@sellgar/app';
import { IsDefined, IsArray, ValidateNested } from 'class-validator';

import { MetaEntity } from '../../meta';
import { BrandEntity } from './brand.entity.ts';

@EntityCollection({ entity: BrandEntity, property: 'items' })
export class BrandResultEntity {
  @IsArray()
  @Expose()
  @ValidateNested({ each: true })
  @Type(() => BrandEntity)
  items: BrandEntity[];

  @Expose()
  @IsDefined()
  @ValidateNested()
  @Type(() => MetaEntity)
  meta: MetaEntity;
}
