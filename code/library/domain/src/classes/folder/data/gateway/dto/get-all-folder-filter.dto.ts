import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { Expose } from 'class-transformer';

import type { GetAllFolderFilterInput } from '../input/get-all-folder-filter.input.ts';

export class GetAllFolderFilterDto implements GetAllFolderFilterInput {
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
  parentUuid?: string;
}
