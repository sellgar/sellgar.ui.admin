import { StoreProductEntity } from '@library/domain';
import type { RevalidateServiceInterface } from '@sellgar/app';
import { StoreOfferChangesProvider } from '../store-offer-changes.provider.ts';
import type {
  StoreOfferChangesHubInterface,
  StoreOfferChangesListener,
} from '../classes/hub/store-offer-changes-hub.interface.ts';

describe('Store changes use the owner read model', () => {
  it('does not reinsert archived sales from a full Store snapshot', async () => {
    const opened = Object.assign(new StoreProductEntity(), { uuid: 'store', version: 1, offers: [] });
    let listener!: StoreOfferChangesListener;
    const cleanup = vi.fn();
    const hub = {
      subscribe: (value: StoreOfferChangesListener) => {
        listener = value;
        return cleanup;
      },
    } as unknown as StoreOfferChangesHubInterface;
    const revalidate = { revalidate: vi.fn().mockResolvedValue(undefined) } as unknown as RevalidateServiceInterface;
    const provider = new StoreOfferChangesProvider(hub, revalidate);
    const dispose = provider.activate();
    await listener.updated(
      Object.assign(new StoreProductEntity(), {
        uuid: 'store',
        version: 2,
        offers: [{ uuid: 'archived', status: 'archived' }],
      }),
    );
    expect(opened.offers).toEqual([]);
    expect(opened.version).toBe(1);
    expect(revalidate.revalidate).toHaveBeenCalledOnce();
    expect(dispose).toBe(cleanup);
  });

  it('keeps a failed source refresh visible to the delivery caller', async () => {
    let listener!: StoreOfferChangesListener;
    const hub = {
      subscribe: (value: StoreOfferChangesListener) => {
        listener = value;
        return vi.fn();
      },
    } as unknown as StoreOfferChangesHubInterface;
    const revalidate = {
      revalidate: vi.fn().mockRejectedValue(new Error('Store unavailable')),
    } as unknown as RevalidateServiceInterface;
    new StoreOfferChangesProvider(hub, revalidate).activate();
    await expect(listener.created(new StoreProductEntity())).rejects.toThrow('Store unavailable');
  });
});
