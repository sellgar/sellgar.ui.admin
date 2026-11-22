import type { MetaEntity } from '../../classes/meta';

export interface CursorPageInput<T> {
  items: T[];
  meta: MetaEntity;
}
