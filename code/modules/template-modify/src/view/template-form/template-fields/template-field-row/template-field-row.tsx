import { PropertyKind, type PropertyEntity } from '@library/domain';
import { Button, Caption, Checkbox, Field, InputSelect, Typography } from '@sellgar/kit';
import { reactive, useController } from '@sellgar/app/react';
import { DeleteBinLineIcon, DragMove2LineIcon } from '@sellgar/kit/icons';
import * as Motion from 'framer-motion';
import React from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';

import type { TemplateFormInput } from '../../../../classes/controller/input/template-form.input.ts';
import { PropertySearchControllerInterface } from '../../../../classes/controller/property-search/property-search-controller.interface.ts';
import s from './default.module.css';

type FieldCollectionName = 'productFields' | 'variantFields';

interface IProps {
  readonly name: FieldCollectionName;
  readonly index: number;
  readonly properties: PropertyEntity[];
  readonly inProcess: boolean;
  readonly fieldId: string;
  readonly onMove: (offset: number) => void;
  readonly onDelete: () => void;
}

const TemplateFieldRowComponent: React.FC<IProps> = (props) => {
  const { control, setValue } = useFormContext<TemplateFormInput>();
  const search = useController(PropertySearchControllerInterface);
  const propertyCode = useWatch({ control, name: `${props.name}.${props.index}.propertyCode` });
  const property = search.getSelected(propertyCode) ?? props.properties.find((item) => item.code === propertyCode);
  const booleanProperty = property?.kind === PropertyKind.BOOLEAN;
  const dragControls = Motion.useDragControls();
  const [dragging, setDragging] = React.useState(false);

  return (
    <Motion.Reorder.Item
      className={s.wrapper}
      as={'div'}
      value={props.fieldId}
      dragListener={false}
      dragControls={dragControls}
      drag={props.inProcess ? false : 'y'}
      data-dragging={dragging}
      onDragStart={() => setDragging(true)}
      onDragEnd={() => setDragging(false)}
    >
      <span className={s.handle}>
        <Button.Icon
          type={'button'}
          size={'sm'}
          style={'ghost'}
          aria-label={`Перетащить свойство ${property?.name ?? props.index + 1}`}
          title={'Перетащите для изменения порядка'}
          leadIcon={<DragMove2LineIcon />}
          disabled={props.inProcess}
          onPointerDown={(event) => {
            if (!props.inProcess) dragControls.start(event);
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
              event.preventDefault();
              props.onMove(event.key === 'ArrowUp' ? -1 : 1);
            }
          }}
        />
      </span>
      <div className={s.property}>
        <Controller
          name={`${props.name}.${props.index}.propertyCode`}
          control={control}
          disabled={props.inProcess}
          render={({ field, fieldState: { error } }) => (
            <Field>
              <Field.Content>
                <InputSelect
                  ref={field.ref}
                  size={'xs'}
                  options={search.options}
                  optionKey={'code'}
                  optionValue={'name'}
                  value={property ?? null}
                  placeholder={'Выберите свойство'}
                  disabled={props.inProcess}
                  target={error ? 'destructive' : undefined}
                  loading={search.loading}
                  loadingMore={search.loadingMore}
                  error={search.error}
                  searchPlaceholder={'Название или код свойства'}
                  onSearch={search.search}
                  onEndReached={search.loadNext}
                  onBlur={field.onBlur}
                  onChange={(value) => {
                    if (value) search.remember(value);
                    field.onChange(value?.code ?? '');
                    if (value?.kind === PropertyKind.BOOLEAN) {
                      setValue(`${props.name}.${props.index}.multiple`, false, { shouldDirty: true });
                    }
                  }}
                />
              </Field.Content>
              {error?.message && (
                <Field.Caption>
                  <Caption state={'destructive'} caption={error.message} />
                </Field.Caption>
              )}
            </Field>
          )}
        />
      </div>

      <div className={s.flags}>
        <div className={s.flag}>
          <Controller
            name={`${props.name}.${props.index}.required`}
            control={control}
            render={({ field }) => (
              <Checkbox
                id={`${props.fieldId}-required`}
                size={'sm'}
                aria-label={`Обязательное: ${property?.name ?? props.index + 1}`}
                checked={field.value}
                disabled={props.inProcess}
                onBlur={field.onBlur}
                onChange={(event) => field.onChange(event.currentTarget.checked)}
              />
            )}
          />
          <Typography size={'caption-l'}>
            <label className={s['mobile-label']} htmlFor={`${props.fieldId}-required`}>
              Обязательное
            </label>
          </Typography>
        </div>
        <div className={s.flag}>
          <Controller
            name={`${props.name}.${props.index}.multiple`}
            control={control}
            render={({ field }) => (
              <Checkbox
                id={`${props.fieldId}-multiple`}
                size={'sm'}
                aria-label={`Несколько значений: ${property?.name ?? props.index + 1}`}
                checked={field.value}
                disabled={props.inProcess || booleanProperty}
                onBlur={field.onBlur}
                onChange={(event) => field.onChange(event.currentTarget.checked)}
              />
            )}
          />
          <Typography size={'caption-l'}>
            <label className={s['mobile-label']} htmlFor={`${props.fieldId}-multiple`}>
              Несколько значений
            </label>
          </Typography>
        </div>
      </div>

      <div className={s.remove}>
        <Button.Icon
          type={'button'}
          size={'sm'}
          style={'ghost'}
          aria-label={`Удалить свойство ${property?.name ?? props.index + 1}`}
          title={'Удалить свойство'}
          leadIcon={<DeleteBinLineIcon />}
          disabled={props.inProcess}
          onClick={props.onDelete}
        />
      </div>
    </Motion.Reorder.Item>
  );
};

export const TemplateFieldRow = reactive(TemplateFieldRowComponent);
