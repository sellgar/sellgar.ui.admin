import { reactive } from '@sellgar/app/react';
import type { PropertyEntity } from '@library/domain';
import { Typography } from '@sellgar/kit';

import React from 'react';

import s from './default.module.css';

interface IProps {
  property: PropertyEntity;
}

const NameComponent: React.FC<IProps> = (props) => {
  return (
    <div className={s.wrapper}>
      <Typography size={'caption-l'} weight={'semi-bold'}>
        <p className={s.name}>{props.property.name}</p>
      </Typography>
      {props.property.unit ? (
        <Typography size={'caption-m'} weight={'semi-bold'}>
          <p className={s.unit}>[{props.property.unit.symbol}]</p>
        </Typography>
      ) : null}
    </div>
  );
};

export const Name = reactive(NameComponent);
