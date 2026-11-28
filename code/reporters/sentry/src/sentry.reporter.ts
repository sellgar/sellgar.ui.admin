import { ConfigInterface, EnvConfigInterface } from '@library/domain';
import {
  type ApplicationReport,
  type ApplicationReportHandlerInterface,
  type ApplicationReporterContextInterface,
  Inject,
  Reporter,
  UseBindings,
} from '@sellgar/app';

import { SentryBindings } from './classes/classes.bindings.ts';
import { SentryClientInterface } from './classes/client/sentry';
import { SentryReportMapper } from './classes/mapper/sentry-report';

@UseBindings(SentryBindings)
@Reporter()
export class SentryReporter implements ApplicationReportHandlerInterface {
  constructor(
    @Inject(ConfigInterface) private readonly config: ConfigInterface,
    @Inject(EnvConfigInterface) private readonly envConfig: EnvConfigInterface,
    @Inject(SentryClientInterface) private readonly client: SentryClientInterface,
  ) {}

  initialize(): void {
    const appUiVersion = this.envConfig.get('VITE_APP_UI_VERSION') ?? '';
    const appUiRelease = this.envConfig.get('VITE_SENTRY_RELEASE') ?? '';
    const release =
      [appUiVersion, appUiRelease ? `(${appUiRelease})` : undefined].filter(Boolean).join(' ') || undefined;

    this.client.initialize({
      enabled: this.config.get('VITE_USE_SENTRY') === true,
      dsn: (this.config.get('VITE_SENTRY_API') ?? '').trim(),
      environment: this.config.get('VITE_SENTRY_ENVIRONMENT'),
      release,
    });
  }

  report(report: ApplicationReport, context: ApplicationReporterContextInterface): void {
    this.client.log(SentryReportMapper.map(report, context));
  }

  dispose(): Promise<void> {
    return this.client.dispose();
  }
}
