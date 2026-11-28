import { ProfileEntity } from '@library/domain';
import {
  type ApplicationReport,
  type ApplicationReporterContextInterface,
  InternalServerErrorException,
  type RuntimeFailureReport,
  type RuntimeOwner,
  type RuntimeParticipant,
} from '@sellgar/app';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SentryReportMapper } from '..';
import { createReporterContext } from '../../../../__test__/fixtures/reporter-context.fixture.ts';

let context: ApplicationReporterContextInterface;
beforeEach(() => {
  context = createReporterContext();
});

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

class TestController {}

describe('SentryReportMapper', () => {
  it.each([
    ['debug', 'breadcrumb'],
    ['info', 'breadcrumb'],
    ['warning', 'breadcrumb'],
    ['error', 'event'],
  ] as const)('maps a %s report to a %s', (level, kind) => {
    const applicationReport = report(level);

    expect(SentryReportMapper.map(applicationReport, context)).toEqual({
      kind,
      level,
      message: 'Test event',
      error: undefined,
      user: null,
      contexts: { session: { phase: 'unknown', revision: 0 } },
      context: { context: { screen: 'test' }, event: 'test.event', reportId: 'report:1', reportedAt: 2 },
      tags: { event: 'test.event', reportId: 'report:1', session_phase: 'unknown' },
    });
  });

  it('uses the event name when no message is provided and preserves the original error', () => {
    const cause = new Error('Original failure');
    const entry = SentryReportMapper.map({ ...report('error'), message: undefined, cause }, context);

    expect(entry.message).toBe('test.event');
    expect(entry.error).toBe(cause);
  });

  it('preserves the complete runtime event metadata and the failure cause', () => {
    const runtimeReport = failure();
    const entry = SentryReportMapper.map(runtimeReport, context);

    expect(entry).toEqual({
      kind: 'event',
      level: 'error',
      message: 'Test event',
      error: runtimeReport.failure.cause,
      handled: false,
      user: null,
      contexts: {
        runtime: { operation: 'render', ownerKind: 'application', participantKind: 'runtime' },
        session: { phase: 'unknown', revision: 0 },
      },
      context: {
        error: { type: 'Error', message: 'Failure', stack: (runtimeReport.failure.cause as Error).stack },
        context: { screen: 'test' },
        createdAt: 1,
        ownerState: 'failed',
        propagation: [],
        reportedAt: 2,
      },
      tags: {
        disposition: 'application.failed',
        event: 'runtime.failure',
        operation: 'render',
        owner: 'application',
        participant: 'runtime',
        runtimeFailureId: 'failure:1',
        session_phase: 'unknown',
      },
    });
    expect(entry.error).toBe(runtimeReport.failure.cause);
  });

  it('keeps a contained failure handled and preserves its propagation', () => {
    const runtimeReport = failure();
    const propagation = [{ at: 1, disposition: 'widget.failed' as const, owner: { kind: 'application' as const } }];
    const contained: RuntimeFailureReport = {
      ...runtimeReport,
      disposition: 'widget.failed',
      failure: { ...runtimeReport.failure, propagation },
    };
    const entry = SentryReportMapper.map(contained, context);

    expect(entry.handled).toBe(true);
    expect(entry.context?.propagation).toEqual([{ at: 1, disposition: 'widget.failed', ownerKind: 'application' }]);
    expect(contained.failure.propagation).toBe(propagation);
  });

  it.each<[RuntimeOwner, Record<string, unknown>]>([
    [{ kind: 'application' }, { ownerKind: 'application' }],
    [
      { kind: 'router', id: 'router:1' },
      { ownerKind: 'router', ownerId: 'router:1' },
    ],
    [
      { kind: 'route', id: 'route:1' },
      { ownerKind: 'route', ownerId: 'route:1' },
    ],
    [
      { kind: 'module', token: 'test.module' },
      { ownerKind: 'module', ownerToken: 'test.module' },
    ],
    [
      { kind: 'widget', instanceId: 'widget:1', token: Symbol.for('test.widget') },
      { ownerKind: 'widget', ownerInstanceId: 'widget:1', ownerToken: 'Symbol(test.widget)' },
    ],
  ])('maps owner %j to a stable diagnostic object', (owner, expected) => {
    const runtimeReport = failure();
    const sourceReport = {
      ...runtimeReport,
      failure: { ...runtimeReport.failure, source: { ...runtimeReport.failure.source, owner } },
    };
    const entry = SentryReportMapper.map(sourceReport, context);

    expect(entry.contexts?.runtime).toEqual({ operation: 'render', participantKind: 'runtime', ...expected });
  });

  it.each<[RuntimeParticipant, Record<string, unknown>]>([
    [{ kind: 'runtime' }, { participantKind: 'runtime' }],
    [
      { kind: 'controller', token: TestController },
      { participantKind: 'controller', participantToken: 'TestController' },
    ],
    [
      { kind: 'provider', token: Symbol.for('test.provider') },
      { participantKind: 'provider', participantToken: 'Symbol(test.provider)' },
    ],
    [
      { kind: 'policy', token: 'test.policy' },
      { participantKind: 'policy', participantToken: 'test.policy' },
    ],
  ])('maps participant %j without SDK-specific token formatting', (participant, expected) => {
    const runtimeReport = failure();
    const sourceReport = {
      ...runtimeReport,
      failure: { ...runtimeReport.failure, source: { ...runtimeReport.failure.source, participant } },
    };
    const entry = SentryReportMapper.map(sourceReport, context);

    expect(entry.contexts?.runtime).toEqual({ operation: 'render', ownerKind: 'application', ...expected });
  });

  describe('user and session', () => {
    it.each(['anonymous', 'authenticated', 'unknown'] as const)('includes the %s session phase', (phase) => {
      const entry = SentryReportMapper.map(report('error'), createReporterContext(phase));

      expect(entry.contexts?.session).toEqual({ phase, revision: 0 });
      expect(entry.tags?.session_phase).toBe(phase);
    });

    it('copies only the authorized user identity into the prepared record', () => {
      const current = createReporterContext('authenticated');
      const profile = Object.assign(new ProfileEntity(), {
        user: { uuid: '00000000-0000-4000-8000-000000000007', login: 'Test User' },
      });
      vi.mocked(current.store.get).mockReturnValue(profile);

      const entry = SentryReportMapper.map(report('error'), current);

      expect(current.store.get).toHaveBeenCalledExactlyOnceWith(ProfileEntity);
      expect(entry.user).toEqual({ id: '00000000-0000-4000-8000-000000000007', username: 'Test User' });
      profile.user.login = 'Changed later';
      expect(entry.user?.username).toBe('Test User');
    });

    it('keeps an authenticated session visible when its profile is missing', () => {
      const entry = SentryReportMapper.map(report('error'), createReporterContext('authenticated'));

      expect(entry.user).toBeNull();
      expect(entry.contexts?.session?.phase).toBe('authenticated');
    });

    it.each(['anonymous', 'unknown'] as const)('does not use a stale profile in a %s session', (phase) => {
      const current = createReporterContext(phase);
      vi.mocked(current.store.get).mockReturnValue(
        Object.assign(new ProfileEntity(), {
          user: { uuid: '00000000-0000-4000-8000-000000000007', login: 'Old User' },
        }),
      );

      const entry = SentryReportMapper.map(report('error'), current);

      expect(entry.user).toBeNull();
      expect(current.store.get).not.toHaveBeenCalled();
    });
  });

  describe('backend log correlation', () => {
    const traceId = '4BF92F3577B34DA6A3CE929D0E0E4736';
    const problem = (extensions: Record<string, unknown>) =>
      new InternalServerErrorException({ status: 500, title: 'Internal Server Error', ...extensions });

    it.each([
      [`00-${traceId}-00f067aa0ba902b7-01`, { otel_trace_id: traceId.toLowerCase(), correlation_id: 'corr-1' }],
      [traceId, { otel_trace_id: traceId.toLowerCase(), correlation_id: 'corr-1' }],
      ['|4bf92f35.1.', { correlation_id: 'corr-1' }],
      ['', { correlation_id: 'corr-1' }],
      [null, { correlation_id: 'corr-1' }],
    ])('tags a failed HTTP report with traceId %j', (value, expected) => {
      const entry = SentryReportMapper.map(
        {
          ...report('error'),
          cause: problem({ traceId: value, correlationId: 'corr-1' }),
        },
        context,
      );

      expect(entry.tags).toEqual({ event: 'test.event', reportId: 'report:1', session_phase: 'unknown', ...expected });
    });

    it('finds the HTTP failure through the runtime failure cause chain', () => {
      const runtimeReport = failure();
      const cause = new Error('Command failed', {
        cause: problem({ traceId: `00-${traceId}-00f067aa0ba902b7-01`, correlationId: '  ' }),
      });
      const sourceReport: RuntimeFailureReport = { ...runtimeReport, failure: { ...runtimeReport.failure, cause } };
      const entry = SentryReportMapper.map(sourceReport, context);

      expect(entry.tags).toMatchObject({ otel_trace_id: traceId.toLowerCase(), runtimeFailureId: 'failure:1' });
      expect(entry.tags).not.toHaveProperty('correlation_id');
    });

    it('ignores ProblemDetails-like data outside an HTTP failure', () => {
      const cause = Object.assign(new Error('Not HTTP'), { response: { traceId, correlationId: 'corr-1' } });

      expect(SentryReportMapper.map({ ...report('error'), cause }, context).tags).toEqual({
        event: 'test.event',
        reportId: 'report:1',
        session_phase: 'unknown',
      });
    });
  });
});
