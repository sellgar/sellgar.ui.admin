import type { ApplicationReporterContextInterface, SessionRuntimePhase } from '@sellgar/app';
import { vi } from 'vitest';

export const createReporterContext = (phase: SessionRuntimePhase = 'unknown'): ApplicationReporterContextInterface => ({
  app: {
    lifecycle: { phase: 'ready', exception: null },
    location: null,
    subscribe: vi.fn(() => () => undefined),
    subscribeLocation: vi.fn(() => () => undefined),
  },
  session: {
    phase,
    revision: 0,
    expire: vi.fn(),
    setAnonymous: vi.fn(),
    setAuthenticated: vi.fn(),
    setUnknown: vi.fn(),
    subscribe: vi.fn(() => () => undefined),
    subscribeInterruption: vi.fn(() => () => undefined),
  },
  signal: new AbortController().signal,
  store: {
    clear: vi.fn(),
    delete: vi.fn(),
    get: vi.fn(),
    getMany: vi.fn(),
    has: vi.fn(),
    set: vi.fn(),
    setMany: vi.fn(),
  },
});
