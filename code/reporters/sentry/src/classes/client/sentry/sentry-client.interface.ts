import type { SentryInitializeInput } from './input/sentry-initialize.input.ts';
import type { SentryLogInput } from './input/sentry-log.input.ts';

export abstract class SentryClientInterface {
  abstract initialize(options: SentryInitializeInput): void;
  abstract log(input: SentryLogInput): void;
  abstract dispose(): Promise<void>;
}
