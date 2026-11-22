import { Expose } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ProductTypeQueryDto {
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
