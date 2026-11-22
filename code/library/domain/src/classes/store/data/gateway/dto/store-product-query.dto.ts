import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Expose } from 'class-transformer';

import type { StoreProductQueryInput } from '../input/store-product-query.input.ts';

export class StoreProductQueryDto implements StoreProductQueryInput {
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

  @Expose()
  @IsOptional()
  @IsString()
  search?: string;
}
