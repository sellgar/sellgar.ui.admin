import * as Sentry from '@sentry/react';
import { Injectable } from '@sellgar/app';

import type { SentryClientInterface } from './sentry-client.interface.ts';
import type { SentryInitializeInput } from './input/sentry-initialize.input.ts';
import type { SentryLogInput } from './input/sentry-log.input.ts';

const CLOSE_TIMEOUT_MILLISECONDS = 2_000;

@Injectable()
export class SentryClient implements SentryClientInterface {
  private sdkClient: ReturnType<typeof Sentry.init>;

  initialize(options: SentryInitializeInput): void {
    if (!options.enabled || !options.dsn) return;

    this.sdkClient = Sentry.init({
      dsn: options.dsn,
      environment: options.environment,
      release: options.release,
      integrations: (defaults) => defaults.filter((integration) => integration.name !== 'Console'),
      dataCollection: {
        cookies: false,
        httpBodies: [],
        httpHeaders: false,
        stackFrameVariables: false,
        urlQueryParams: false,
        userInfo: false,
      },
    });
  }

  log(entry: SentryLogInput): void {
    const client = this.sdkClient;
    if (!client) return;

    if (entry.kind === 'breadcrumb') {
      Sentry.addBreadcrumb({
        category: 'application',
        level: entry.level,
        message: entry.message,
        data: entry.context,
      });
      return;
    }

    const scope = Sentry.getCurrentScope().clone();
    scope.setClient(client);
    scope.setUser(entry.user ?? null);
    scope.setLevel(entry.level);
    scope.setTags(entry.tags ?? {});
    scope.setExtras(entry.context ?? {});
    for (const [name, context] of Object.entries(entry.contexts ?? {})) {
      scope.setContext(name, context);
    }

    if (entry.error !== undefined) {
      scope.captureException(entry.error, {
        mechanism: { type: 'generic', handled: entry.handled ?? true },
      });
      return;
    }

    scope.captureMessage(entry.message, entry.level);
  }

  async dispose(): Promise<void> {
    const client = this.sdkClient;
    this.sdkClient = undefined;
    await client?.close(CLOSE_TIMEOUT_MILLISECONDS);
  }
}
