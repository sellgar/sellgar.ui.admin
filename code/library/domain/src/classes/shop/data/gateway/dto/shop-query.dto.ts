import { Expose } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Max, Min } from 'class-validator';

import type { ShopQueryInput } from '../input/shop-query.input.ts';

export class ShopQueryDto implements ShopQueryInput {
  @Expose()
  @IsOptional()
  @IsString()
  term?: string;

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
