import type { PropertyEntity, PropertyResultEntity } from '@library/domain';

export abstract class PropertySearchStoreInterface {
  abstract readonly options: PropertyEntity[];
  abstract readonly loading: boolean;
  abstract readonly loadingMore: boolean;
  abstract readonly error: string | undefined;
  abstract readonly nextToken: string | null;
  abstract start(append: boolean): void;
  abstract complete(page: PropertyResultEntity, append: boolean): void;
  abstract fail(): void;
  abstract remember(property: PropertyEntity): void;
  abstract getSelected(code: string): PropertyEntity | undefined;
  abstract reset(): void;
}
