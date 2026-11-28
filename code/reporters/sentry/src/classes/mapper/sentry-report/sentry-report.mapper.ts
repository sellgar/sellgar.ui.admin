import { ProfileEntity } from '@library/domain';
import {
  type ApplicationReport,
  type ApplicationReporterContextInterface,
  type DependencyToken,
  type RuntimeFailureReport,
  type RuntimeOwner,
  type RuntimeParticipant,
} from '@sellgar/app';

import type { SentryLogInput } from '../../client/sentry';
import { SentryErrorMapper } from './mapper/sentry-error';

interface SessionSnapshot {
  readonly phase: ApplicationReporterContextInterface['session']['phase'];
  readonly revision: number;
  readonly user: SentryLogInput['user'];
}

export class SentryReportMapper {
  static map(report: ApplicationReport, context: ApplicationReporterContextInterface): SentryLogInput {
    const session = this.readSession(context);

    if (this.isRuntimeFailure(report)) {
      return this.mapRuntimeFailure(report, session);
    }

    return this.mapApplicationReport(report, session);
  }

  private static isRuntimeFailure(report: ApplicationReport): report is RuntimeFailureReport {
    return report.event === 'runtime.failure' && 'failure' in report;
  }

  private static readSession(context: ApplicationReporterContextInterface): SessionSnapshot {
    const { phase, revision } = context.session;
    const profile = phase === 'authenticated' ? context.store.get(ProfileEntity) : undefined;

    return {
      phase,
      revision,
      user: profile ? { id: profile.user.uuid, username: profile.user.login } : null,
    };
  }

  private static mapApplicationReport(report: ApplicationReport, session: SessionSnapshot): SentryLogInput {
    const diagnostic = SentryErrorMapper.map(report.cause);

    return {
      kind: report.level === 'error' ? 'event' : 'breadcrumb',
      level: report.level,
      message: report.message ?? report.event,
      error: diagnostic.error,
      user: session.user,
      contexts: {
        session: { phase: session.phase, revision: session.revision },
      },
      context: {
        ...diagnostic.data,
        ...(report.context !== undefined ? { context: report.context } : {}),
        event: report.event,
        reportId: report.id,
        reportedAt: report.reportedAt,
      },
      tags: {
        event: report.event,
        reportId: report.id,
        ...diagnostic.tags,
        session_phase: session.phase,
      },
    };
  }

  private static mapRuntimeFailure(report: RuntimeFailureReport, session: SessionSnapshot): SentryLogInput {
    const { failure } = report;
    const { owner, participant } = failure.source;
    const diagnostic = SentryErrorMapper.map(failure.cause);

    return {
      kind: 'event',
      level: 'error',
      message: report.message ?? report.event,
      error: diagnostic.error,
      handled: report.disposition !== 'application.failed',
      user: session.user,
      contexts: {
        runtime: {
          operation: failure.source.operation,
          ...this.mapOwner(owner),
          ...this.mapParticipant(participant),
        },
        session: { phase: session.phase, revision: session.revision },
      },
      context: {
        ...diagnostic.data,
        ...(report.context !== undefined ? { context: report.context } : {}),
        createdAt: failure.createdAt,
        ownerState: report.ownerState,
        propagation: failure.propagation.map((hop) => ({
          at: hop.at,
          disposition: hop.disposition,
          ...this.mapOwner(hop.owner),
        })),
        reportedAt: report.reportedAt,
      },
      tags: {
        disposition: report.disposition,
        event: report.event,
        operation: failure.source.operation,
        owner: owner.kind,
        participant: participant.kind,
        runtimeFailureId: failure.id,
        ...diagnostic.tags,
        session_phase: session.phase,
      },
    };
  }

  private static mapOwner(owner: RuntimeOwner): Record<string, unknown> {
    switch (owner.kind) {
      case 'application':
        return { ownerKind: owner.kind };
      case 'router':
      case 'route':
        return { ownerId: owner.id, ownerKind: owner.kind };
      case 'module':
        return { ownerKind: owner.kind, ownerToken: this.mapToken(owner.token) };
      case 'widget':
        return { ownerInstanceId: owner.instanceId, ownerKind: owner.kind, ownerToken: this.mapToken(owner.token) };
    }
  }

  private static mapParticipant(participant: RuntimeParticipant): Record<string, unknown> {
    if ('token' in participant) {
      return { participantKind: participant.kind, participantToken: this.mapToken(participant.token) };
    }
    return { participantKind: participant.kind };
  }

  private static mapToken(token: DependencyToken<unknown>): string {
    return typeof token === 'function' ? token.name : String(token);
  }
}
