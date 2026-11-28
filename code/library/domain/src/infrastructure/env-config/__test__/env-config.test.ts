import { afterEach, expect, it, vi } from 'vitest';

import { EnvConfig } from '../env-config.ts';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it('reads Vite build metadata independently of the runtime window configuration', () => {
  vi.stubEnv('VITE_SENTRY_RELEASE', 'build-sha');
  vi.stubGlobal('window', { env: { VITE_SENTRY_RELEASE: 'runtime-value' } });

  expect(new EnvConfig().get('VITE_SENTRY_RELEASE')).toBe('build-sha');
});
