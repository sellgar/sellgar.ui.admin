import { Expose, Type } from 'class-transformer';
import { IsDefined, IsArray, ValidateNested } from 'class-validator';

import { MetaEntity } from '../../meta';
import { ShopEntity } from './shop.entity.ts';

export class ShopResultEntity {
  @IsArray()
  @Expose()
  @ValidateNested({ each: true })
  @Type(() => ShopEntity)
  items: ShopEntity[];

  @Expose()
  @IsDefined()
  @ValidateNested()
  @Type(() => MetaEntity)
  meta: MetaEntity;
}
