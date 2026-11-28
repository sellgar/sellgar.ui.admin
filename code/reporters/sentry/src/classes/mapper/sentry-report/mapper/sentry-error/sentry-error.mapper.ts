import { isHttpException } from '@sellgar/app';

import { HttpCorrelationMapper } from './mapper/http-correlation';
import { ValidationMapper } from './mapper/validation';
import { DiagnosticValueSerializer } from './serializer/diagnostic-value';

interface SentryErrorMapping {
  readonly error: unknown;
  readonly data: Record<string, unknown>;
  readonly tags: Record<string, string>;
}

interface ErrorDetails {
  readonly fields: Record<string, unknown>;
  readonly validation: Record<string, unknown>[];
  readonly tags: Record<string, string>;
  readonly ancestors: Set<object>;
  count: number;
  backendFound: boolean;
}

const MAX_CAUSES = 32;
const MAX_CAUSE_DEPTH = 10;

export class SentryErrorMapper {
  static map(cause: unknown): SentryErrorMapping {
    if (cause === undefined) return { error: undefined, data: {}, tags: {} };

    const details: ErrorDetails = {
      fields: {},
      validation: [],
      tags: {},
      ancestors: new Set(),
      count: 0,
      backendFound: false,
    };
    this.collectCause(cause, '', details);

    return {
      error: cause instanceof Error ? cause : this.createReportedError(cause, details.fields),
      data: {
        error: details.fields,
        ...(details.validation.length ? { validation: details.validation } : {}),
      },
      tags: { ...details.tags, ...(details.validation.length ? { error_kind: 'validation' } : {}) },
    };
  }

  private static collectCause(cause: unknown, path: string, details: ErrorDetails): void {
    const prefix = path ? `${path}.` : '';
    if (++details.count > MAX_CAUSES || details.ancestors.size >= MAX_CAUSE_DEPTH) {
      details.fields[`${prefix}truncated`] = '[Error chain limit]';
      return;
    }
    if (ValidationMapper.supports(cause)) {
      const validation = ValidationMapper.map(cause, path || 'root');
      details.fields[`${prefix}type`] = 'ValidationError';
      details.fields[`${prefix}message`] = validation.message;
      details.validation.push(...validation.fields);
      return;
    }

    const isObject = typeof cause === 'object' && cause !== null;
    details.fields[`${prefix}type`] = cause instanceof Error ? cause.name : this.nonErrorType(cause);
    if (!isObject) {
      details.fields[`${prefix}value`] = DiagnosticValueSerializer.serialize(cause);
      details.fields[`${prefix}message`] = String(cause);
      return;
    }
    if (details.ancestors.has(cause)) {
      details.fields[`${prefix}circular`] = true;
      return;
    }

    details.ancestors.add(cause);
    try {
      const properties = Object.getOwnPropertyDescriptors(cause);
      Object.assign(details.fields, this.mapObjectFields(cause, properties, prefix));
      if (!details.backendFound && isHttpException(cause)) {
        details.backendFound = true;
        Object.assign(details.tags, HttpCorrelationMapper.map(cause.response));
      }
      if (properties.cause && 'value' in properties.cause && properties.cause.value !== undefined) {
        this.collectCause(properties.cause.value, `${prefix}cause`, details);
      }
      if (cause instanceof AggregateError && Array.isArray(properties.errors?.value)) {
        for (const [index, error] of properties.errors.value.entries()) {
          if (details.count >= MAX_CAUSES) {
            details.fields[`${prefix}errors.truncated`] = '[Error chain limit]';
            break;
          }
          this.collectCause(error, `${prefix}errors[${index}]`, details);
        }
      }
    } catch {
      details.fields[`${prefix}unreadable`] = true;
    } finally {
      details.ancestors.delete(cause);
    }
  }

  private static mapObjectFields(
    cause: object,
    properties: PropertyDescriptorMap,
    prefix: string,
  ): Record<string, unknown> {
    const fields: Record<string, unknown> = {};
    const message = cause instanceof Error ? cause.message : properties.message?.value;
    const stack = cause instanceof Error ? cause.stack : properties.stack?.value;
    if (typeof message === 'string') fields[`${prefix}message`] = message;
    if (typeof stack === 'string') fields[`${prefix}stack`] = stack;

    const additional = Object.fromEntries(
      Object.entries(properties)
        .filter(([key]) => {
          if (key === 'cause') return false;
          if (key === 'message' && typeof message === 'string') return false;
          if (key === 'stack' && typeof stack === 'string') return false;
          if (key === 'name' && cause instanceof Error) return false;
          return key !== 'errors' || !(cause instanceof AggregateError);
        })
        .map(([key, property]) => [key, 'value' in property ? property.value : '[Accessor]']),
    );
    if (Object.keys(additional).length) {
      Object.assign(fields, DiagnosticValueSerializer.flatten(additional, `${prefix}details`));
    }
    return fields;
  }

  private static createReportedError(cause: unknown, fields: Record<string, unknown>): Error {
    const message =
      typeof fields.message === 'string'
        ? fields.message
        : `${fields.type}: ${DiagnosticValueSerializer.serialize(cause)}`;
    const error = new Error(message, { cause });
    error.name = String(fields.type);
    // A non-Error cause has no original call stack. Do not report this mapper's stack as its origin.
    error.stack = typeof fields.stack === 'string' ? fields.stack : undefined;
    return error;
  }

  private static nonErrorType(value: unknown): string {
    if (value === null) return 'ThrownNull';
    if (Array.isArray(value)) return 'ThrownArray';
    const type = typeof value;
    return `Thrown${type[0].toUpperCase()}${type.slice(1)}`;
  }
}
