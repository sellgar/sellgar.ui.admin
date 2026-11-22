import React from 'react';
import { Button, Modal, Typography } from '@sellgar/kit';
import type { UserRequestConfirmViewProps } from '@sellgar/app/react';

import s from './default.module.css';

export const ConfirmUserRequestView: React.FC<UserRequestConfirmViewProps> = (props) => {
  return (
    <Modal open={true} onClose={props.cancel}>
      <div className={s.wrapper}>
        <div className={s.content}>
          {props.request.payload.title && (
            <Typography size={'body-m'} weight={'semi-bold'}>
              <p className={s.text}>{props.request.payload.title}</p>
            </Typography>
          )}
          {props.request.payload.description && (
            <Typography size={'caption-m'}>
              <p className={s.text}>{props.request.payload.description}</p>
            </Typography>
          )}
        </div>
        <div className={s.controls}>
          <Button size={'sm'} style={'secondary'} autoFocus={true} onClick={props.cancel}>
            {props.request.payload.cancelText ?? 'Отмена'}
          </Button>
          <Button
            size={'sm'}
            target={props.request.payload.status === 'destructive' ? 'destructive' : 'default'}
            onClick={() => props.apply()}
          >
            {props.request.payload.applyText ?? 'Подтвердить'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
