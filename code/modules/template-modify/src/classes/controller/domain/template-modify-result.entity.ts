import { Expose, Type } from 'class-transformer';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { ProductTypeEntity, PropertyEntity } from '@library/domain';

export class TemplateModifyResultEntity {
  @Expose()
  @IsOptional()
  @ValidateNested()
  @Type(() => ProductTypeEntity)
  template?: ProductTypeEntity;

  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PropertyEntity)
  properties: PropertyEntity[];
}
