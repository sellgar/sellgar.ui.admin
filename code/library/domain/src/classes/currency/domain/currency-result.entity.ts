import { Expose, Type } from 'class-transformer';
import { IsDefined, IsArray, ValidateNested } from 'class-validator';

import { MetaEntity } from '../../meta';
import { CurrencyEntity } from './currency.entity.ts';

export class CurrencyResultEntity {
  @IsArray()
  @Expose()
  @ValidateNested({ each: true })
  @Type(() => CurrencyEntity)
  items: CurrencyEntity[];

  @Expose()
  @IsDefined()
  @ValidateNested()
  @Type(() => MetaEntity)
  meta: MetaEntity;
}
