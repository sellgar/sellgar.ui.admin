import { Entity } from '@sellgar/app';
import { Expose, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

import { UnitEntity } from '../../unit';

import { PropertyOptionEntity } from './property-option.entity.ts';
import { PropertyKind } from './property-kind.enum.ts';

@Entity({ identity: 'code' })
export class PropertyEntity {
  @Expose()
  @IsString()
  code: string;

  @Expose()
  @IsString()
  name: string;

  @Expose()
  @IsOptional()
  @IsString()
  description: string | null;

  @Expose()
  @IsEnum(PropertyKind)
  kind: PropertyKind;

  @Expose()
  @IsOptional()
  @IsString()
  unitCode: string | null;

  @Expose()
  @ValidateIf((_object, value) => value !== null)
  @ValidateNested()
  @Type(() => UnitEntity)
  unit: UnitEntity | null;

  @Expose()
  @IsInt()
  version: number;

  @IsArray()
  @Expose()
  @ValidateNested({ each: true })
  @Type(() => PropertyOptionEntity)
  options: PropertyOptionEntity[];

  @Expose()
  @IsDateString()
  createdAt: string;

  @Expose()
  @IsDateString()
  updatedAt: string;
}
