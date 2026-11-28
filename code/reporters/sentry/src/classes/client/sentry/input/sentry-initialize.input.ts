export interface SentryInitializeInput {
  readonly enabled: boolean;
  readonly dsn: string;
  readonly environment?: string;
  readonly release?: string;
}
