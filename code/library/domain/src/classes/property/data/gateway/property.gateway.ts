import { Inject, Injectable, RequestExecutorInterface } from '@sellgar/app';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';

import { PropertyQueryDto } from './dto/property-query.dto.ts';
import { ConfigInterface } from '../../../../infrastructure/config/config.interface.ts';
import { DeviceServiceInterface } from '../../../../infrastructure/device/service/device-service.interface.ts';
import { HttpRequest } from '../../../../infrastructure/http-client';
import { PropertyEntity } from '../../domain/property.entity.ts';
import { PropertyResultEntity } from '../../domain/property-result.entity.ts';
import { PropertySortField } from '../../domain/property-sort-field.enum.ts';
import { PropertySortDirection } from '../../domain/property-sort-direction.enum.ts';
import { CreatePropertyDto } from './dto/create-property.dto.ts';
import { UpdatePropertyDto } from './dto/update-property.dto.ts';
import { CreatePropertyOptionDto } from './dto/create-property-option.dto.ts';
import { PropertyOptionDto } from './dto/property-option.dto.ts';
import { UpdatePropertyOptionDto } from './dto/update-property-option.dto.ts';
import { CreatePropertyInput } from './input/create-property.input.ts';
import { UpdatePropertyInput } from './input/update-property.input.ts';
import { PropertyOptionInput } from './input/property-option.input.ts';
import { UpdatePropertyOptionInput } from './input/update-property-option.input.ts';
import { PropertyGatewayInterface } from './property-gateway.interface.ts';

@Injectable()
export class PropertyGateway implements PropertyGatewayInterface {
  constructor(
    @Inject(ConfigInterface) private readonly config: ConfigInterface,
    @Inject(DeviceServiceInterface) private readonly deviceService: DeviceServiceInterface,
    @Inject(RequestExecutorInterface) private readonly requestExecutor: RequestExecutorInterface,
  ) {}

  async update(code: string, input: UpdatePropertyInput): Promise<PropertyEntity> {
    const dto = plainToInstance(UpdatePropertyDto, input);
    await validateOrReject(dto);
    const result = await this.requestExecutor.run({ scope: `property:update:${code}` }, ({ signal }) => {
      const request = new HttpRequest({ deviceId: this.deviceService.getUniqueId(), signal });
      return request.patch(this.config.get('GATEWAY_API') + '/v2/properties/' + encodeURIComponent(code), dto);
    });
    return this.toProperty(result);
  }

  async create(input: CreatePropertyInput): Promise<PropertyEntity> {
    const dto = plainToInstance(CreatePropertyDto, input);
    await validateOrReject(dto);
    const result = await this.requestExecutor.run({ scope: 'property:create' }, ({ signal }) => {
      const request = new HttpRequest({ deviceId: this.deviceService.getUniqueId(), signal });
      return request.post(this.config.get('GATEWAY_API') + '/v2/properties', dto);
    });
    return this.toProperty(result);
  }

  async findByCode(code: string): Promise<PropertyEntity> {
    const result = await this.requestExecutor.run({ scope: `property:${code}` }, ({ signal }) => {
      const request = new HttpRequest({ deviceId: this.deviceService.getUniqueId(), signal });
      return request.get(this.config.get('GATEWAY_API') + '/v2/properties/' + encodeURIComponent(code));
    });
    return this.toProperty(result);
  }

  async findAll(
    limit?: number,
    nextToken?: string,
    search?: string,
    sortBy?: PropertySortField,
    sortDirection?: PropertySortDirection,
  ): Promise<PropertyResultEntity> {
    const dto = plainToInstance(PropertyQueryDto, { limit, nextToken, search, sortBy, sortDirection });
    await validateOrReject(dto);
    const response = await this.requestExecutor.run({ scope: 'properties:list' }, ({ signal }) => {
      const request = new HttpRequest({ deviceId: this.deviceService.getUniqueId(), signal });
      return request.get(this.config.get('GATEWAY_API') + '/v2/properties', { params: dto });
    });
    const page = plainToInstance(PropertyResultEntity, response);
    await validateOrReject(page);
    return page;
  }

  async createOption(code: string, version: number, option: PropertyOptionInput): Promise<PropertyEntity> {
    const dto = plainToInstance(CreatePropertyOptionDto, {
      version,
      option: plainToInstance(PropertyOptionDto, option),
    });
    await validateOrReject(dto);
    const result = await this.requestExecutor.run({ scope: `property:${code}:option:create` }, ({ signal }) => {
      const request = new HttpRequest({ deviceId: this.deviceService.getUniqueId(), signal });
      return request.post(
        this.config.get('GATEWAY_API') + '/v2/properties/' + encodeURIComponent(code) + '/options',
        dto,
      );
    });
    return this.toProperty(result);
  }

  async updateOption(code: string, optionCode: string, input: UpdatePropertyOptionInput): Promise<PropertyEntity> {
    const dto = plainToInstance(UpdatePropertyOptionDto, input);
    await validateOrReject(dto);
    const result = await this.requestExecutor.run({ scope: `property:${code}:option:${optionCode}` }, ({ signal }) => {
      const request = new HttpRequest({ deviceId: this.deviceService.getUniqueId(), signal });
      return request.patch(
        this.config.get('GATEWAY_API') +
          '/v2/properties/' +
          encodeURIComponent(code) +
          '/options/' +
          encodeURIComponent(optionCode),
        dto,
      );
    });
    return this.toProperty(result);
  }

  private async toProperty(result: unknown): Promise<PropertyEntity> {
    const entity = plainToInstance(PropertyEntity, result);
    await validateOrReject(entity);
    return entity;
  }
}
