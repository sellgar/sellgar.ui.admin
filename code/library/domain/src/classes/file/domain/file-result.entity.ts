import { Expose, Type } from 'class-transformer';
import { IsDefined, IsArray, ValidateNested } from 'class-validator';

import { MetaEntity } from '../../meta';
import { FileEntity } from './file.entity.ts';

export class FileResultEntity {
  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FileEntity)
  items: FileEntity[];

  @Expose()
  @IsDefined()
  @ValidateNested()
  @Type(() => MetaEntity)
  meta: MetaEntity;
}
