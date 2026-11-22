import { Inject, Injectable } from '@sellgar/app';

import { collectCursorPages } from '../../../infrastructure/pagination/collect-cursor-pages.ts';
import { BrandServiceInterface } from './brand-service.interface.ts';
import { BrandGatewayInterface } from '../data/gateway/brand-gateway.interface.ts';
import { CreateBrandInput } from '../data/gateway/input/create-brand.input.ts';
import { UpdateBrandInput } from '../data/gateway/input/update-brand.input.ts';
import { BrandEntity } from '../domain/brand.entity.ts';
import { BrandResultEntity } from '../domain/brand-result.entity.ts';

@Injectable()
export class BrandService implements BrandServiceInterface {
  constructor(@Inject(BrandGatewayInterface) private readonly brandGateway: BrandGatewayInterface) {}

  getCatalogue(): Promise<BrandEntity[]> {
    return collectCursorPages((nextToken) => this.brandGateway.findAll(100, nextToken));
  }

  findAll(limit?: number, nextToken?: string): Promise<BrandResultEntity> {
    return this.brandGateway.findAll(limit, nextToken);
  }

  findByCode(code: string): Promise<BrandEntity> {
    return this.brandGateway.findByCode(code);
  }

  update(code: string, input: UpdateBrandInput): Promise<BrandEntity> {
    return this.brandGateway.update(code, input);
  }

  create(input: CreateBrandInput): Promise<BrandEntity> {
    return this.brandGateway.create(input);
  }
}
