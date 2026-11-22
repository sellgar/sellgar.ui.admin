import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { Expose } from 'class-transformer';

import type { GetAllFileFilterInput } from '../input/get-all-file-filter.input.ts';

export class GetAllFileFilterDto implements GetAllFileFilterInput {
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
  @IsUUID()
  @IsOptional()
  folderUuid?: string;
}
