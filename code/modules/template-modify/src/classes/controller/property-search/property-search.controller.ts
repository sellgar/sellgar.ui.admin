import { PropertyServiceInterface, type PropertyEntity } from '@library/domain';
import { Controller, Inject } from '@sellgar/app';

import { PropertySearchControllerInterface } from './property-search-controller.interface.ts';
import { PropertySearchStoreInterface } from '../../store/property-search/property-search-store.interface.ts';

@Controller()
export class PropertySearchController implements PropertySearchControllerInterface {
  private generation = 0;
  private term = '';
  private disposed = false;

  constructor(
    @Inject(PropertyServiceInterface) private readonly propertyService: PropertyServiceInterface,
    @Inject(PropertySearchStoreInterface) private readonly store: PropertySearchStoreInterface,
  ) {}

  get options() {
    return this.store.options;
  }
  get loading() {
    return this.store.loading;
  }
  get loadingMore() {
    return this.store.loadingMore;
  }
  get error() {
    return this.store.error;
  }

  async search(term: string): Promise<void> {
    if (this.disposed) return;
    this.reset();
    this.term = term.trim();
    if (this.term) await this.read(false);
  }

  async loadNext(): Promise<void> {
    if (this.disposed || this.store.loading || this.store.loadingMore || !this.store.nextToken || this.store.error)
      return;
    await this.read(true);
  }

  remember(property: PropertyEntity): void {
    this.store.remember(property);
  }

  getSelected(code: string): PropertyEntity | undefined {
    return this.store.getSelected(code);
  }

  reset(): void {
    this.generation++;
    this.term = '';
    this.store.reset();
  }

  dispose(): void {
    this.disposed = true;
    this.reset();
  }

  private async read(append: boolean): Promise<void> {
    const generation = this.generation;
    const nextToken = append ? this.store.nextToken! : undefined;
    this.store.start(append);

    try {
      const page = await this.propertyService.findAll(20, nextToken, this.term);
      if (generation === this.generation) this.store.complete(page, append);
    } catch {
      if (generation === this.generation) this.store.fail();
    }
  }
}
