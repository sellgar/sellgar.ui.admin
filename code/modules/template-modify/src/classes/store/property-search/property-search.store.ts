import { Injectable } from '@sellgar/app';
import type { PropertyEntity, PropertyResultEntity } from '@library/domain';
import { makeAutoObservable, observable } from 'mobx';

import { PropertySearchStoreInterface } from './property-search-store.interface.ts';

@Injectable()
export class PropertySearchStore implements PropertySearchStoreInterface {
  options: PropertyEntity[] = [];
  loading = false;
  loadingMore = false;
  error: string | undefined;
  nextToken: string | null = null;
  private readonly selected = observable.map<string, PropertyEntity>({}, { deep: false });

  constructor() {
    makeAutoObservable(this, { options: observable.ref });
  }

  start(append: boolean): void {
    if (!append) this.options = [];
    this.loading = !append;
    this.loadingMore = append;
    this.error = undefined;
  }

  complete(page: PropertyResultEntity, append: boolean): void {
    this.options = append ? [...this.options, ...page.items] : page.items;
    this.nextToken = page.meta.nextToken;
    this.loading = false;
    this.loadingMore = false;
  }

  fail(): void {
    this.loading = false;
    this.loadingMore = false;
    this.error = 'Не удалось загрузить свойства. Повторите поиск.';
  }

  remember(property: PropertyEntity): void {
    this.selected.set(property.code, property);
  }

  getSelected(code: string): PropertyEntity | undefined {
    return this.selected.get(code);
  }

  reset(): void {
    this.options = [];
    this.loading = false;
    this.loadingMore = false;
    this.error = undefined;
    this.nextToken = null;
  }
}
