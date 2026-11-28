import * as Sentry from '@sentry/react';
import type { Event } from '@sentry/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SentryClient } from '../sentry.client.ts';
import type { SentryLogInput } from '../input/sentry-log.input.ts';

const { events } = vi.hoisted(() => ({ events: [] as Event[] }));

vi.mock('@sentry/react', async (importOriginal) => {
  const sdk = await importOriginal<typeof import('@sentry/react')>();
  return {
    ...sdk,
    init: vi.fn((options: Parameters<typeof sdk.init>[0]) =>
      sdk.init({
        ...options,
        transport: () => ({
          send: async (envelope) => {
            for (const [header, body] of envelope[1]) {
              if (header.type === 'event') events.push(body as Event);
            }
            return { statusCode: 200 };
          },
          flush: async () => true,
        }),
      }),
    ),
  };
});

const options = { enabled: true, dsn: 'https://public@sentry.example/1', environment: 'test', release: 'release-sha' };
const createLog = (overrides: Partial<SentryLogInput> = {}): SentryLogInput => ({
  kind: 'event',
  level: 'error',
  message: 'Test event',
  ...overrides,
});

beforeEach(() => {
  events.length = 0;
  vi.clearAllMocks();
  Sentry.getCurrentScope().clearBreadcrumbs();
});
afterEach(async () => {
  await Sentry.close();
});

describe('SentryClient', () => {
  it.each([{ enabled: false }, { dsn: '' }])(
    'does not initialize or send when connection is unavailable: %s',
    async (override) => {
      const client = new SentryClient();
      client.initialize({ ...options, ...override });
      client.log(createLog({ message: 'Disabled' }));
      await client.dispose();
      expect(Sentry.init).not.toHaveBeenCalled();
      expect(events).toEqual([]);
    },
  );

  it('sets release and environment and excludes console capture and automatic personal data', async () => {
    const client = new SentryClient();
    client.initialize(options);
    const sdkClient = vi.mocked(Sentry.init).mock.results[0]!.value!;
    expect(sdkClient.getOptions()).toMatchObject({
      dsn: options.dsn,
      environment: 'test',
      release: 'release-sha',
      dataCollection: {
        cookies: false,
        httpBodies: [],
        httpHeaders: false,
        stackFrameVariables: false,
        urlQueryParams: false,
        userInfo: false,
      },
    });
    expect(sdkClient.getIntegrationByName('Console')).toBeUndefined();
    client.log(createLog({ message: 'Configured' }));
    await client.dispose();
    expect(events[0]).toMatchObject({ environment: 'test', release: 'release-sha' });
  });

  it('keeps breadcrumbs and confines prepared metadata to its own event', async () => {
    const client = new SentryClient();
    client.initialize(options);
    client.log(createLog({ kind: 'breadcrumb', level: 'info', message: 'Opened', context: { screen: 'test' } }));
    const first = createLog({
      message: 'First',
      error: new Error('First failure'),
      tags: { source: 'first' },
      context: { requestId: 'request:1' },
      contexts: { operation: { name: 'first' } },
    });
    client.log(first);
    client.log(createLog({ message: 'Second', tags: { source: 'second' } }));
    await client.dispose();

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      tags: { source: 'first' },
      extra: { requestId: 'request:1' },
      contexts: { operation: { name: 'first' } },
    });
    expect(events[0]!.breadcrumbs).toContainEqual(
      expect.objectContaining({ message: 'Opened', data: { screen: 'test' } }),
    );
    expect(events[1]).toMatchObject({ message: 'Second', tags: { source: 'second' } });
    expect(events[1]!.extra ?? {}).not.toHaveProperty('requestId');
    expect(events[1]!.contexts ?? {}).not.toHaveProperty('operation');
  });

  it('sends prepared diagnostic strings through the SDK without interpreting them', async () => {
    const client = new SentryClient();
    const input = createLog({
      contexts: { diagnostics: { token: 'Symbol(test.widget)', participant: 'TestController' } },
    });
    client.initialize(options);
    client.log(input);
    await client.dispose();

    expect(events[0]?.contexts?.diagnostics).toEqual(input.contexts?.diagnostics);
  });

  it('applies a supplied user and clears inherited identity for a record without a user', async () => {
    const client = new SentryClient();
    client.initialize(options);
    Sentry.getCurrentScope().setUser({ id: 'inherited' });

    try {
      client.log(createLog({ message: 'With user', user: { id: '7', username: 'Test User' } }));
      client.log(createLog({ message: 'Without user', user: null }));
      await client.dispose();

      expect(events[0]?.user).toEqual({ id: '7', username: 'Test User' });
      expect(events[1]?.user?.id).toBeUndefined();
      expect(Sentry.getCurrentScope().getUser()).toEqual({ id: 'inherited' });
    } finally {
      Sentry.getCurrentScope().setUser(null);
      await client.dispose();
    }
  });

  it('preserves unhandled failures and closes its SDK client before ignoring later reports', async () => {
    const client = new SentryClient();
    client.initialize(options);
    const sdkClient = vi.mocked(Sentry.init).mock.results[0]!.value!;
    const close = vi.spyOn(sdkClient, 'close');
    client.log(createLog({ error: new Error('Crash'), handled: false }));
    await client.dispose();
    client.log(createLog({ message: 'After disposal' }));
    await client.dispose();
    expect(events).toHaveLength(1);
    expect(events[0]!.exception?.values).toContainEqual(
      expect.objectContaining({ value: 'Crash', mechanism: expect.objectContaining({ handled: false }) }),
    );
    expect(close).toHaveBeenCalledExactlyOnceWith(2000);
  });
});
