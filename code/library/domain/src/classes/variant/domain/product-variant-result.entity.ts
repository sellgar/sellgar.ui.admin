import { Expose, Type } from 'class-transformer';
import { IsDefined, IsArray, ValidateNested } from 'class-validator';

import { MetaEntity } from '../../meta';
import { VariantEntity } from './variant.entity.ts';

export class ProductVariantResultEntity {
  @IsArray()
  @Expose()
  @ValidateNested({ each: true })
  @Type(() => VariantEntity)
  items: VariantEntity[];

  @Expose()
  @IsDefined()
  @ValidateNested()
  @Type(() => MetaEntity)
  meta: MetaEntity;
}
