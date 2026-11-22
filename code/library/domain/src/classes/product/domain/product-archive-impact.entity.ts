import { Expose } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class ProductArchiveImpactEntity {
  @Expose()
  @IsInt()
  @Min(0)
  offerCount: number;

  @Expose()
  @IsInt()
  @Min(0)
  shopCount: number;
}
