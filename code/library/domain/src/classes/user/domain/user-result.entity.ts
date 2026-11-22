import { Expose, Type } from 'class-transformer';
import { IsDefined, IsArray, ValidateNested } from 'class-validator';

import { MetaEntity } from '../../meta';
import { UserEntity } from './user.entity.ts';

export class UserResultEntity {
  @Expose()
  @IsArray()
  @Type(() => UserEntity)
  @ValidateNested({ each: true })
  items: UserEntity[];

  @Expose()
  @IsDefined()
  @ValidateNested()
  @Type(() => MetaEntity)
  meta: MetaEntity;
}
