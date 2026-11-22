import { ProductEntity } from '@library/domain';
import type { RevalidateServiceInterface } from '@sellgar/app';
import { ProductChangesProvider } from '../product-changes.provider.ts';
import type {
  ProductChangesHubInterface,
  ProductChangesListener,
} from '../classes/hub/product-changes-hub.interface.ts';

describe('Product changes use the owner read model', () => {
  it('does not replace an opened product with an integration snapshot containing archived variants', async () => {
    const opened = Object.assign(new ProductEntity(), { uuid: 'product', version: 1, variants: [] });
    let listener!: ProductChangesListener;
    const cleanup = vi.fn();
    const hub = {
      subscribe: (value: ProductChangesListener) => {
        listener = value;
        return cleanup;
      },
    } as unknown as ProductChangesHubInterface;
    const revalidate = { revalidate: vi.fn().mockResolvedValue(undefined) } as unknown as RevalidateServiceInterface;
    const provider = new ProductChangesProvider(hub, revalidate);
    const dispose = provider.activate();
    await listener.updated(
      Object.assign(new ProductEntity(), {
        uuid: 'product',
        version: 2,
        variants: [{ uuid: 'archived', status: 'archived' }],
      }),
    );
    expect(opened.version).toBe(1);
    expect(opened.variants).toEqual([]);
    expect(revalidate.revalidate).toHaveBeenCalledOnce();
    expect(dispose).toBe(cleanup);
  });

  it('propagates a failed refresh so delivery is not acknowledged as applied', async () => {
    let listener!: ProductChangesListener;
    const hub = {
      subscribe: (value: ProductChangesListener) => {
        listener = value;
        return vi.fn();
      },
    } as unknown as ProductChangesHubInterface;
    const revalidate = {
      revalidate: vi.fn().mockRejectedValue(new Error('Owner unavailable')),
    } as unknown as RevalidateServiceInterface;
    new ProductChangesProvider(hub, revalidate).activate();
    await expect(listener.created(new ProductEntity())).rejects.toThrow('Owner unavailable');
  });
});
