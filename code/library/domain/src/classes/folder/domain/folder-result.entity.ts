import { Expose, Type } from 'class-transformer';
import { IsDefined, IsArray, ValidateNested } from 'class-validator';

import { MetaEntity } from '../../meta';
import { FolderEntity } from './folder.entity.ts';

export class FolderResultEntity {
  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FolderEntity)
  items: FolderEntity[];

  @Expose()
  @IsDefined()
  @ValidateNested()
  @Type(() => MetaEntity)
  meta: MetaEntity;
}
