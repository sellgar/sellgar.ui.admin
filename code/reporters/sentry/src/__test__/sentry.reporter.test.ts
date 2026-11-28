import * as Sentry from '@sentry/react';
import { ConfigInterface, EnvConfigInterface, ProfileEntity } from '@library/domain';
import {
  type ApplicationReport,
  type RuntimeFailureReport,
  Route,
  Router,
  segments,
  UseBindings,
  type BindingModuleInterface,
  type BindingRegistryInterface,
} from '@sellgar/app';
import { Application, type ApplicationConfiguratorInterface, createWebRouterBridge, Module } from '@sellgar/app/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SentryClientInterface } from '../classes/client/sentry';
import { SentryReporter } from '../sentry.reporter.ts';
import { createReporterContext } from './fixtures/reporter-context.fixture.ts';

vi.mock('@sentry/react', () => ({ init: vi.fn() }));

const configValues: Record<string, unknown> = {
  VITE_USE_SENTRY: true,
  VITE_SENTRY_API: ' https://public@sentry.example/1 ',
  VITE_SENTRY_ENVIRONMENT: 'staging',
  VITE_SENTRY_RELEASE: 'build-sha',
};
const config: ConfigInterface = { get: vi.fn((key: string) => configValues[key]) as ConfigInterface['get'] };
const envValues: Record<string, string> = {
  VITE_APP_UI_VERSION: '0.9.0',
  VITE_SENTRY_RELEASE: 'image-sha',
};
const envConfig: EnvConfigInterface = {
  get: vi.fn((key: keyof ImportMetaEnv) => envValues[key]) as EnvConfigInterface['get'],
};

const createClient = (): SentryClientInterface => ({
  initialize: vi.fn(),
  log: vi.fn(),
  dispose: vi.fn(async () => undefined),
});
const createReporter = (client: SentryClientInterface) => new SentryReporter(config, envConfig, client);
const report = (level: ApplicationReport['level']): ApplicationReport => ({
  event: 'test.event',
  level,
  message: 'Test event',
  id: 'report:1',
  reportedAt: 2,
  context: { screen: 'test' },
});
const failure = (): RuntimeFailureReport => {
  const cause = new Error('Failure');
  return {
    ...report('error'),
    event: 'runtime.failure',
    level: 'error',
    cause,
    disposition: 'application.failed',
    ownerState: 'failed',
    failure: {
      cause,
      id: 'failure:1',
      createdAt: 1,
      propagation: [],
      source: { operation: 'render', owner: { kind: 'application' }, participant: { kind: 'runtime' } },
    },
  };
};

class TestBindings implements BindingModuleInterface {
  register(registry: BindingRegistryInterface): void {
    registry.bind(ConfigInterface).toConstantValue(config);
    registry.bind(EnvConfigInterface).toConstantValue(envConfig);
  }
}
@Module({ view: () => null })
class TestModule {}

@UseBindings(TestBindings)
class TestApplication extends Application {
  protected configure(app: ApplicationConfiguratorInterface): void {
    app.router(new Router({ routes: [new Route({ address: segments('test'), load: async () => ({ TestModule }) })] }));
  }
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SentryReporter', () => {
  it('gets configuration through injected configuration ports', async () => {
    const client = createClient();
    await createReporter(client).initialize();
    expect(client.initialize).toHaveBeenCalledWith({
      enabled: true,
      dsn: 'https://public@sentry.example/1',
      environment: 'staging',
      release: '0.9.0 (image-sha)',
    });
    expect(config.get).not.toHaveBeenCalledWith('VITE_SENTRY_RELEASE');
    expect(envConfig.get).toHaveBeenCalledWith('VITE_APP_UI_VERSION');
    expect(envConfig.get).toHaveBeenCalledWith('VITE_SENTRY_RELEASE');
  });

  it('keeps reporting disabled when runtime configuration and build metadata are absent', async () => {
    const client = createClient();
    const absentConfig: ConfigInterface = { get: vi.fn() };
    const absentEnv: EnvConfigInterface = { get: vi.fn() };

    await new SentryReporter(absentConfig, absentEnv, client).initialize();

    expect(client.initialize).toHaveBeenCalledExactlyOnceWith({
      enabled: false,
      dsn: '',
      environment: undefined,
      release: undefined,
    });
  });

  it.each([
    ['1.2.3', undefined, '1.2.3'],
    [undefined, 'image-sha', '(image-sha)'],
  ])('uses available build metadata without undefined text (%s, %s)', async (version, sha, release) => {
    const client = createClient();
    const values: Record<string, string | undefined> = { VITE_APP_UI_VERSION: version, VITE_SENTRY_RELEASE: sha };
    const partialEnv: EnvConfigInterface = {
      get: ((key: keyof ImportMetaEnv) => values[key]) as EnvConfigInterface['get'],
    };

    await new SentryReporter(config, partialEnv, client).initialize();

    expect(client.initialize).toHaveBeenCalledWith(expect.objectContaining({ release }));
  });

  it('registers the ordinary declaration through application DI without a configure factory', async () => {
    const app = new TestApplication({ routerBridge: createWebRouterBridge({ basePath: '/' }) });
    app.reporter([SentryReporter]);
    app.compose();
    await app.initialize();
    await app.dispose();
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({ dsn: 'https://public@sentry.example/1', release: '0.9.0 (image-sha)' }),
    );
  });

  it.each(['debug', 'info', 'warning', 'error'] as const)('prepares a %s report before calling the client', (level) => {
    const client = createClient();
    const applicationReport = report(level);

    createReporter(client).report(applicationReport, createReporterContext());

    expect(client.log).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        kind: level === 'error' ? 'event' : 'breadcrumb',
        level,
        message: 'Test event',
      }),
    );
    expect(vi.mocked(client.log).mock.calls[0]![0]).not.toBe(applicationReport);
  });

  it('prepares runtime metadata and preserves the original error before calling the client', () => {
    const client = createClient();
    const runtimeReport = failure();

    createReporter(client).report(runtimeReport, createReporterContext());

    expect(client.log).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        kind: 'event',
        level: 'error',
        error: runtimeReport.failure.cause,
        handled: false,
        tags: expect.objectContaining({ disposition: 'application.failed', operation: 'render' }),
      }),
    );
    const input = vi.mocked(client.log).mock.calls[0]![0];
    expect(input.error).toBe(runtimeReport.failure.cause);
    expect(input).not.toHaveProperty('failure');
  });

  it('uses the supplied framework context to prepare user and session before calling the client', () => {
    const client = createClient();
    const context = createReporterContext('authenticated');
    const profile = Object.assign(new ProfileEntity(), {
      user: { uuid: '00000000-0000-4000-8000-000000000007', login: 'Test User' },
    });
    vi.mocked(context.store.get).mockReturnValue(profile);

    createReporter(client).report(report('error'), context);

    expect(context.store.get).toHaveBeenCalledExactlyOnceWith(ProfileEntity);
    expect(client.log).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        user: { id: '00000000-0000-4000-8000-000000000007', username: 'Test User' },
        contexts: { session: { phase: 'authenticated', revision: 0 } },
        tags: expect.objectContaining({ session_phase: 'authenticated' }),
      }),
    );
    expect(vi.mocked(client.log).mock.calls[0]![0]).not.toHaveProperty('store');
  });

  it('delegates SDK shutdown to its client', async () => {
    const client = createClient();
    await createReporter(client).dispose();
    expect(client.dispose).toHaveBeenCalledOnce();
  });
});
