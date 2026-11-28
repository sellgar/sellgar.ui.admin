import type { User } from '@sentry/react';

export interface SentryLogInput {
  readonly kind: 'event' | 'breadcrumb';
  readonly level: 'debug' | 'info' | 'warning' | 'error';
  readonly message: string;
  readonly error?: unknown;
  readonly handled?: boolean;
  readonly user?: User | null;
  readonly tags?: Record<string, string>;
  readonly context?: Record<string, unknown>;
  readonly contexts?: Record<string, Record<string, unknown>>;
}
