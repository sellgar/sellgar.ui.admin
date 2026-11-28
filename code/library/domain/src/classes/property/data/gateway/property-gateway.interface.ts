import { CreatePropertyInput } from './input/create-property.input.ts';
import { UpdatePropertyInput } from './input/update-property.input.ts';
import { PropertyOptionInput } from './input/property-option.input.ts';
import { UpdatePropertyOptionInput } from './input/update-property-option.input.ts';
import { PropertyEntity } from '../../domain/property.entity.ts';
import { PropertyResultEntity } from '../../domain/property-result.entity.ts';
import { PropertySortField } from '../../domain/property-sort-field.enum.ts';
import { PropertySortDirection } from '../../domain/property-sort-direction.enum.ts';

export abstract class PropertyGatewayInterface {
  abstract findAll(
    limit?: number,
    nextToken?: string,
    search?: string,
    sortBy?: PropertySortField,
    sortDirection?: PropertySortDirection,
  ): Promise<PropertyResultEntity>;
  abstract findByCode(code: string): Promise<PropertyEntity>;
  abstract create(input: CreatePropertyInput): Promise<PropertyEntity>;
  abstract update(code: string, input: UpdatePropertyInput): Promise<PropertyEntity>;
  abstract createOption(code: string, version: number, option: PropertyOptionInput): Promise<PropertyEntity>;
  abstract updateOption(code: string, optionCode: string, input: UpdatePropertyOptionInput): Promise<PropertyEntity>;
}
