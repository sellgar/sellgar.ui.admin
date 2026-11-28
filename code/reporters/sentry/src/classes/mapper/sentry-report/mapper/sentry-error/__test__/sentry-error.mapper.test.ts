import { InternalServerErrorException } from '@sellgar/app';
import { ValidationError } from 'class-validator';
import { describe, expect, it, vi } from 'vitest';

import { SentryErrorMapper } from '..';

const validationError = (property: string, value: unknown, constraints: Record<string, string>) =>
  Object.assign(new ValidationError(), { property, value, constraints });

describe('SentryErrorMapper', () => {
  it('keeps native Error identity, original stack and nested diagnostic fields', () => {
    const cause = Object.assign(new TypeError('Cannot load terminals'), {
      code: 'TERMINALS_FAILED',
      request: { method: 'GET', url: '/terminals' },
    });
    const originalStack = cause.stack;
    const mapped = SentryErrorMapper.map(cause);

    expect(mapped.error).toBe(cause);
    expect(cause.stack).toBe(originalStack);
    expect(mapped.data.error).toEqual({
      type: 'TypeError',
      message: 'Cannot load terminals',
      stack: originalStack,
      'details.code': 'TERMINALS_FAILED',
      'details.request.method': 'GET',
      'details.request.url': '/terminals',
    });
  });

  it('preserves parent constraints as well as children and complete nested paths', () => {
    const child = validationError('nextCursor', 42, { isString: 'nextCursor must be a string' });
    child.contexts = { isString: { code: 1001 } };
    const parent = validationError('items', {}, { isArray: 'items must be an array' });
    parent.children = [Object.assign(validationError('0', {}, {}), { children: [child] })];

    const mapped = SentryErrorMapper.map([parent]);

    expect(mapped.error).toBeInstanceOf(Error);
    expect(mapped.error).toMatchObject({
      name: 'ValidationError',
      message: 'Validation failed: items (isArray); items.0.nextCursor (isString)',
      stack: undefined,
    });
    expect(mapped.data.validation).toEqual([
      expect.objectContaining({ path: 'items', 'constraints.isArray': 'items must be an array' }),
      {
        source: 'root',
        path: 'items.0.nextCursor',
        target: '[unknown]',
        value: 42,
        valueType: 'number',
        'constraints.isString': 'nextCursor must be a string',
        'contexts.isString.code': 1001,
      },
    ]);
  });

  it.each([
    [undefined, '[undefined]', 'undefined'],
    [null, null, 'null'],
    ['', '', 'string'],
    [false, false, 'boolean'],
    [0, 0, 'number'],
    [123n, '123n', 'bigint'],
  ])('distinguishes validation value %s from its type', (value, expectedValue, expectedType) => {
    const mapped = SentryErrorMapper.map([validationError('field', value, { invalid: 'invalid field' })]);

    expect(mapped.data.validation).toEqual([
      expect.objectContaining({ value: expectedValue, valueType: expectedType }),
    ]);
  });

  it('collects validation through Error.cause without replacing the outer error or stack', () => {
    const cause = new Error('Loader rejected response', {
      cause: [validationError('nextCursor', '', { matches: 'must contain a positive cursor' })],
    });
    const mapped = SentryErrorMapper.map(cause);

    expect(mapped.error).toBe(cause);
    expect(mapped.data.error).toMatchObject({ 'cause.type': 'ValidationError' });
    expect(mapped.data.validation).toEqual([
      expect.objectContaining({ source: 'cause', path: 'nextCursor', value: '' }),
    ]);
  });

  it('collects HTTP response, request and correlation through an aggregate cause', () => {
    const http = new InternalServerErrorException(
      {
        title: 'Backend failed',
        traceId: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
        correlationId: 'corr-1',
      },
      { request: { method: 'GET', url: '/terminals' } },
    );
    const cause = new AggregateError([http, { reason: { code: 'INVALID' } }], 'Several failures');
    const mapped = SentryErrorMapper.map(cause);

    expect(mapped.error).toBe(cause);
    expect(mapped.data.error).toMatchObject({
      'errors[0].details.status': 500,
      'errors[0].details.response.title': 'Backend failed',
      'errors[0].details.request.url': '/terminals',
      'errors[1].details.reason.code': 'INVALID',
    });
    expect(mapped.tags).toEqual({ otel_trace_id: '4bf92f3577b34da6a3ce929d0e0e4736', correlation_id: 'corr-1' });
  });

  it('does not collapse ordinary objects into a string and preserves their supplied stack', () => {
    const cause = {
      message: 'Payload failed',
      stack: 'Error: Payload failed\n    at load (/app/loader.ts:10:4)',
      payload: { count: false },
    };
    const mapped = SentryErrorMapper.map(cause);

    expect(mapped.error).toMatchObject({ name: 'ThrownObject', message: cause.message, stack: cause.stack });
    expect(mapped.data.error).toMatchObject({ 'details.payload.count': false });
  });

  it('keeps custom name and errors fields in ordinary objects', () => {
    const mapped = SentryErrorMapper.map({
      name: 'BackendProblem',
      message: 'Invalid request',
      errors: { field: ['Invalid field'] },
    });

    expect(mapped.data.error).toMatchObject({
      message: 'Invalid request',
      'details.name': 'BackendProblem',
      'details.errors.field[0]': 'Invalid field',
    });
  });

  it.each(['failed', 7, false, null, Symbol.for('failure'), 123n])(
    'prepares non-Error cause %s without a fake stack',
    (cause) => {
      const mapped = SentryErrorMapper.map(cause);

      expect(mapped.error).toBeInstanceOf(Error);
      expect((mapped.error as Error).stack).toBeUndefined();
      expect(mapped.data.error).toHaveProperty('value');
    },
  );

  it('terminates a cyclic cause and does not invoke getters in diagnostic properties', () => {
    const getter = vi.fn(() => {
      throw new Error('Must not read');
    });
    const cause = new Error('Cyclic');
    cause.cause = cause;
    Object.defineProperty(cause, 'unsafe', { get: getter });
    const mapped = SentryErrorMapper.map(cause);

    expect(mapped.error).toBe(cause);
    expect(mapped.data.error).toMatchObject({ 'cause.circular': true, 'details.unsafe': '[Accessor]' });
    expect(getter).not.toHaveBeenCalled();
  });

  it('formats nested cyclic validation values and terminates cycles in validation children', () => {
    const value: Record<string, unknown> = { nested: { id: 1 } };
    value.self = value;
    const invalid = validationError('value', value, { invalid: 'Invalid data' });
    invalid.children = [invalid];
    const mapped = SentryErrorMapper.map([invalid]);

    expect(mapped.data.validation).toEqual([
      expect.objectContaining({ value: '{"nested.id":1,"self":"[Circular]"}', valueType: 'object' }),
      expect.objectContaining({ path: 'value.value', truncated: '[Circular validation error]' }),
    ]);
  });

  it('marks excessive diagnostic nesting instead of crashing or losing the entire event', () => {
    let cause: unknown = 'root';
    for (let index = 0; index < 15; index++) cause = new Error(`layer ${index}`, { cause });

    const fields = SentryErrorMapper.map(cause).data.error as Record<string, unknown>;

    expect(Object.values(fields)).toContain('[Error chain limit]');
  });

  it('leaves an absent cause as a message-only report', () => {
    expect(SentryErrorMapper.map(undefined)).toEqual({ error: undefined, data: {}, tags: {} });
  });
});
