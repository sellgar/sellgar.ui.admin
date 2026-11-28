import { Expose } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

import { PropertySortField } from '../../../domain/property-sort-field.enum.ts';
import { PropertySortDirection } from '../../../domain/property-sort-direction.enum.ts';

export class PropertyQueryDto {
  @Expose()
  @IsOptional()
  @IsString()
  @MaxLength(256)
  search?: string;

  @Expose()
  @IsOptional()
  @IsEnum(PropertySortField)
  sortBy?: PropertySortField;

  @Expose()
  @IsOptional()
  @IsEnum(PropertySortDirection)
  sortDirection?: PropertySortDirection;

  @Expose()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @Expose()
  @IsOptional()
  @IsString()
  @MaxLength(8192)
  nextToken?: string;
}
