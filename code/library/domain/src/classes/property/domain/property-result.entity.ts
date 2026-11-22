import { EntityCollection } from '@sellgar/app';
import { Expose, Type } from 'class-transformer';
import { IsDefined, IsArray, ValidateNested } from 'class-validator';

import { MetaEntity } from '../../meta';
import { PropertyEntity } from './property.entity.ts';

@EntityCollection({ entity: PropertyEntity, property: 'items' })
export class PropertyResultEntity {
  @IsArray()
  @Expose()
  @ValidateNested({ each: true })
  @Type(() => PropertyEntity)
  items: PropertyEntity[];

  @Expose()
  @IsDefined()
  @ValidateNested()
  @Type(() => MetaEntity)
  meta: MetaEntity;
}
