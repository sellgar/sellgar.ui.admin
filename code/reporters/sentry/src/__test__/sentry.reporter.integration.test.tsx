import * as Sentry from '@sentry/react';
import type { Event } from '@sentry/react';
import { ConfigInterface, EnvConfigInterface, ProfileEntity } from '@library/domain';
import {
  ApplicationReporterInterface,
  ApplicationStoreInterface,
  InternalServerErrorException,
  Route,
  Router,
  SessionRuntimeStateInterface,
  UseBindings,
  type BindingModuleInterface,
  type BindingRegistryInterface,
} from '@sellgar/app';
import { Application, type ApplicationConfiguratorInterface, createWebRouterBridge, Module } from '@sellgar/app/react';
import { createRoot } from 'react-dom/client';
import { IsString, Matches, validate } from 'class-validator';
import { beforeEach, expect, it, vi } from 'vitest';

import { SentryReporter } from '../sentry.reporter.ts';

const { events } = vi.hoisted(() => ({ events: [] as Event[] }));
vi.mock('@sentry/react', async (importOriginal) => {
  const sdk = await importOriginal<typeof import('@sentry/react')>();
  return {
    ...sdk,
    init: (options: Parameters<typeof sdk.init>[0]) =>
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
  };
});

class TestBindings implements BindingModuleInterface {
  register(registry: BindingRegistryInterface): void {
    const values = {
      VITE_USE_SENTRY: true,
      VITE_SENTRY_API: 'https://public@sentry.example/1',
      VITE_SENTRY_ENVIRONMENT: 'test',
      VITE_SENTRY_RELEASE: 'integration-sha',
    };
    registry
      .bind(ConfigInterface)
      .toConstantValue({ get: ((key: keyof typeof values) => values[key]) as ConfigInterface['get'] });
    const envValues = {
      VITE_APP_UI_VERSION: '0.9.0',
      VITE_SENTRY_RELEASE: 'image-sha',
    };
    registry
      .bind(EnvConfigInterface)
      .toConstantValue({ get: ((key: keyof typeof envValues) => envValues[key]) as EnvConfigInterface['get'] });
  }
}
@Module({ view: () => null })
class TestModule {}

@UseBindings(TestBindings)
class TestApplication extends Application {
  get testScope() {
    return this.getApplicationScope();
  }

  protected configure(app: ApplicationConfiguratorInterface): void {
    app.router(new Router({ routes: [new Route({ load: async () => ({ TestModule }) })] }));
  }
}

beforeEach(() => {
  events.length = 0;
});

class ValidatedResponse {
  @IsString()
  @Matches(/^[1-9]\d*$/)
  nextCursor: unknown;
}

it.each(['application', 'runtime'] as const)(
  'sends validation fields and constraints without a delivery stack in a %s report',
  async (kind) => {
    const app = new TestApplication({ routerBridge: createWebRouterBridge({ basePath: '/' }) });
    app.reporter([SentryReporter]);
    app.compose();
    await app.initialize();
    const errors = await validate(new ValidatedResponse());

    try {
      if (kind === 'runtime') {
        await app.failRender(errors);
      } else {
        app.testScope.get(ApplicationReporterInterface).error({ event: 'test.validation', cause: errors });
      }
      await vi.waitFor(() => expect(events).toHaveLength(1));
      expect(events[0]?.exception?.values).toEqual([
        expect.objectContaining({
          type: 'ValidationError',
          value: 'Validation failed: nextCursor (matches, isString)',
        }),
      ]);
      expect(events[0]?.exception?.values?.[0]?.stacktrace).toBeUndefined();
      expect(events[0]?.extra?.validation).toEqual([
        {
          source: 'root',
          path: 'nextCursor',
          target: 'ValidatedResponse',
          value: '[undefined]',
          valueType: 'undefined',
          'constraints.matches': 'nextCursor must match /^[1-9]\\d*$/ regular expression',
          'constraints.isString': 'nextCursor must be a string',
        },
      ]);
    } finally {
      await app.dispose();
      await Sentry.close();
    }
  },
);

it('preserves the original Error stack while exposing validation nested in its cause', async () => {
  const app = new TestApplication({ routerBridge: createWebRouterBridge({ basePath: '/' }) });
  app.reporter([SentryReporter]);
  app.compose();
  await app.initialize();
  const errors = await validate(Object.assign(new ValidatedResponse(), { nextCursor: { nested: { cursor: false } } }));
  const cause = new TypeError('Terminal loader failed', { cause: errors });
  cause.stack = 'TypeError: Terminal loader failed\n    at loadTerminals (https://example.test/terminals.ts:23:5)';

  try {
    app.testScope.get(ApplicationReporterInterface).error({ event: 'test.loader', cause });
    await vi.waitFor(() => expect(events).toHaveLength(1));

    expect(events[0]?.exception?.values).toEqual([
      expect.objectContaining({
        type: 'TypeError',
        value: 'Terminal loader failed',
        stacktrace: {
          frames: [
            expect.objectContaining({
              function: 'loadTerminals',
              filename: 'https://example.test/terminals.ts',
              lineno: 23,
              colno: 5,
            }),
          ],
        },
      }),
    ]);
    expect(events[0]?.tags).toMatchObject({ error_kind: 'validation' });
    expect(events[0]?.extra?.error).toMatchObject({ 'cause.type': 'ValidationError' });
    expect(events[0]?.extra?.validation).toEqual([
      expect.objectContaining({
        source: 'cause',
        path: 'nextCursor',
        value: '{"nested.cursor":false}',
        valueType: 'object',
        'constraints.isString': 'nextCursor must be a string',
      }),
    ]);
    expect(cause.stack).toBe(
      'TypeError: Terminal loader failed\n    at loadTerminals (https://example.test/terminals.ts:23:5)',
    );
  } finally {
    await app.dispose();
    await Sentry.close();
  }
});

it('delivers HTTP details and runtime propagation without SDK depth placeholders', async () => {
  const app = new TestApplication({ routerBridge: createWebRouterBridge({ basePath: '/' }) });
  app.reporter([SentryReporter]);
  app.compose();
  await app.initialize();
  const cause = new Error('Load failed', {
    cause: new InternalServerErrorException(
      {
        title: 'Backend failed',
        traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
        correlationId: 'corr-1',
        details: { field: { reason: 'Invalid' } },
      },
      { request: { method: 'GET', url: '/terminals' } },
    ),
  });

  try {
    await app.failRender(cause);
    await vi.waitFor(() => expect(events).toHaveLength(1));

    expect(events[0]?.contexts?.runtime).toMatchObject({
      operation: 'render',
      ownerKind: 'application',
      participantKind: 'runtime',
    });
    expect(events[0]?.extra?.propagation).toEqual([
      expect.objectContaining({ disposition: 'application.failed', ownerKind: 'application' }),
    ]);
    expect(events[0]?.extra?.error).toMatchObject({
      'cause.details.status': 500,
      'cause.details.request.method': 'GET',
      'cause.details.request.url': '/terminals',
      'cause.details.response.details.field.reason': 'Invalid',
    });
    expect(events[0]?.tags).toMatchObject({
      otel_trace_id: '4bf92f3577b34da6a3ce929d0e0e4736',
      correlation_id: 'corr-1',
    });
    expect(JSON.stringify(events[0]?.extra)).not.toContain('[Object]');
  } finally {
    await app.dispose();
    await Sentry.close();
  }
});

it('captures the current authorized profile and all session phases in SDK events', async () => {
  const app = new TestApplication({ routerBridge: createWebRouterBridge({ basePath: '/' }) });
  app.reporter([SentryReporter]);
  app.compose();
  await app.initialize();
  const store = app.testScope.get(ApplicationStoreInterface);
  const session = app.testScope.get(SessionRuntimeStateInterface);
  const reporter = app.testScope.get(ApplicationReporterInterface);
  const capture = async (message: string) => {
    const expectedCount = events.length + 1;
    reporter.error({
      event: 'test.session',
      cause: new Error(message),
    });
    await vi.waitFor(() => expect(events).toHaveLength(expectedCount));
  };

  try {
    const first = Object.assign(new ProfileEntity(), {
      user: { uuid: '00000000-0000-4000-8000-000000000001', login: 'First User' },
    });
    store.set(ProfileEntity, first);
    session.setAuthenticated();
    await capture('First user failure');
    expect(events[0]).toMatchObject({
      user: { id: '00000000-0000-4000-8000-000000000001', username: 'First User' },
      contexts: { session: { phase: 'authenticated', revision: session.revision } },
      tags: { session_phase: 'authenticated' },
    });

    const second = Object.assign(new ProfileEntity(), {
      user: { uuid: '00000000-0000-4000-8000-000000000002', login: 'Second User' },
    });
    store.set(ProfileEntity, second);
    await capture('Second user failure');
    expect(events[1]?.user).toEqual({ id: '00000000-0000-4000-8000-000000000002', username: 'Second User' });
    expect(events[0]?.user?.id).toBe('00000000-0000-4000-8000-000000000001');

    // Keep the old profile in the store to verify that session phase controls identity.
    session.setAnonymous();
    await capture('Anonymous failure');
    expect(events[2]?.user?.id).toBeUndefined();
    expect(events[2]).toMatchObject({
      contexts: { session: { phase: 'anonymous', revision: session.revision } },
      tags: { session_phase: 'anonymous' },
    });

    session.setUnknown();
    await capture('Unknown session failure');
    expect(events[3]?.user?.id).toBeUndefined();
    expect(events[3]).toMatchObject({
      contexts: { session: { phase: 'unknown', revision: session.revision } },
      tags: { session_phase: 'unknown' },
    });
    expect(events).toHaveLength(4);
    expect(store.get(ProfileEntity)).toBe(second);
  } finally {
    await app.dispose();
    await Sentry.close();
  }
});

it('reports an uncaught React root failure once through the application reporter and marks it unhandled', async () => {
  const app = new TestApplication({ routerBridge: createWebRouterBridge({ basePath: '/' }) });
  app.reporter([SentryReporter]);
  app.compose();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', false);
  const container = document.createElement('div');
  const root = createRoot(container, { onUncaughtError: (error) => void app.failRender(error) });
  const BrokenView = () => {
    throw new Error('Root crashed');
  };
  try {
    // React redirects uncaught errors to act's rejection instead of invoking the root callback.
    root.render(<BrokenView />);
    await vi.waitFor(() => expect(app.lifecycle.phase).toBe('failed'));
    await Sentry.flush(2000);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      release: '0.9.0 (image-sha)',
      tags: { disposition: 'application.failed', operation: 'render', owner: 'application' },
    });
    expect(events[0]!.exception?.values).toContainEqual(
      expect.objectContaining({ value: 'Root crashed', mechanism: expect.objectContaining({ handled: false }) }),
    );
  } finally {
    root.unmount();
    await app.dispose();
    await Sentry.close();
    vi.unstubAllGlobals();
  }
});
