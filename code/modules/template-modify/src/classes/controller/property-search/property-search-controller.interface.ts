import type { PropertyEntity } from '@library/domain';

export abstract class PropertySearchControllerInterface {
  abstract readonly options: PropertyEntity[];
  abstract readonly loading: boolean;
  abstract readonly loadingMore: boolean;
  abstract readonly error: string | undefined;
  abstract search(term: string): Promise<void>;
  abstract loadNext(): Promise<void>;
  abstract remember(property: PropertyEntity): void;
  abstract getSelected(code: string): PropertyEntity | undefined;
  abstract reset(): void;
  abstract dispose(): void;
}
