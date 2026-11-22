import { Expose, Type } from 'class-transformer';
import { IsDefined, IsArray, ValidateNested } from 'class-validator';
import { EntityCollection } from '@sellgar/app';

import { MetaEntity } from '../../meta';
import { UnitEntity } from './unit.entity.ts';

@EntityCollection({ entity: UnitEntity, property: 'items' })
export class UnitResultEntity {
  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UnitEntity)
  items: UnitEntity[];

  @Expose()
  @IsDefined()
  @ValidateNested()
  @Type(() => MetaEntity)
  meta: MetaEntity;
}
