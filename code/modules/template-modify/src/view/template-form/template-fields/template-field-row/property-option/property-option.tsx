import { PropertyKind, type PropertyEntity } from '@library/domain';
import { SelectOption } from '@sellgar/kit';
import React from 'react';

interface IProps {
  readonly property: PropertyEntity;
  readonly selected: boolean;
}

const kindLabels: Record<PropertyKind, string> = {
  [PropertyKind.TEXT]: 'Текст',
  [PropertyKind.INTEGER]: 'Целое число',
  [PropertyKind.DECIMAL]: 'Десятичное число',
  [PropertyKind.BOOLEAN]: 'Да/нет',
  [PropertyKind.DATE]: 'Дата',
  [PropertyKind.OPTIONS]: 'Список',
};

export const PropertyOption: React.FC<IProps> = (props) => (
  <SelectOption
    label={props.property.name}
    caption={kindLabels[props.property.kind]}
    supportText={props.property.unit?.symbol}
    selected={props.selected}
  />
);
