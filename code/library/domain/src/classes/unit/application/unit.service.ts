import { Inject, Injectable } from '@sellgar/app';

import { collectCursorPages } from '../../../infrastructure/pagination/collect-cursor-pages.ts';
import { UnitServiceInterface } from './unit-service.interface.ts';
import { UnitGatewayInterface } from '../data/gateway/unit-gateway.interface.ts';
import { CreateUnitInput } from '../data/gateway/input/create-unit.input.ts';
import { UpdateUnitInput } from '../data/gateway/input/update-unit.input.ts';
import { UnitEntity } from '../domain/unit.entity.ts';
import { UnitResultEntity } from '../domain/unit-result.entity.ts';

@Injectable()
export class UnitService implements UnitServiceInterface {
  constructor(@Inject(UnitGatewayInterface) private readonly unitGateway: UnitGatewayInterface) {}

  getCatalogue(): Promise<UnitEntity[]> {
    return collectCursorPages((nextToken) => this.unitGateway.findAll(100, nextToken));
  }

  findAll(limit?: number, nextToken?: string): Promise<UnitResultEntity> {
    return this.unitGateway.findAll(limit, nextToken);
  }

  findByCode(code: string): Promise<UnitEntity> {
    return this.unitGateway.findByCode(code);
  }

  update(code: string, input: UpdateUnitInput): Promise<UnitEntity> {
    return this.unitGateway.update(code, input);
  }

  create(input: CreateUnitInput): Promise<UnitEntity> {
    return this.unitGateway.create(input);
  }
}
