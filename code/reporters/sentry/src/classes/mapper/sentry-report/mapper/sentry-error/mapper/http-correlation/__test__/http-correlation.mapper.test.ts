import { describe, expect, it } from 'vitest';

import { HttpCorrelationMapper } from '..';

describe('HttpCorrelationMapper', () => {
  it.each([' 00-4BF92F3577B34DA6A3CE929D0E0E4736-00F067AA0BA902B7-01 ', ' 4BF92F3577B34DA6A3CE929D0E0E4736 '])(
    'normalizes trace id %s and trims correlation id',
    (traceId) => {
      expect(HttpCorrelationMapper.map({ traceId, correlationId: ' corr-1 ' })).toEqual({
        otel_trace_id: '4bf92f3577b34da6a3ce929d0e0e4736',
        correlation_id: 'corr-1',
      });
    },
  );

  it.each([undefined, null, 'Backend failure', 500])('ignores a non-object response %s', (response) => {
    expect(HttpCorrelationMapper.map(response)).toEqual({});
  });

  it('omits invalid identifiers without discarding the other valid identifier', () => {
    expect(HttpCorrelationMapper.map({ traceId: 'invalid', correlationId: 'corr-1' })).toEqual({
      correlation_id: 'corr-1',
    });
    expect(
      HttpCorrelationMapper.map({ traceId: '4bf92f3577b34da6a3ce929d0e0e4736', correlationId: ' '.repeat(10) }),
    ).toEqual({ otel_trace_id: '4bf92f3577b34da6a3ce929d0e0e4736' });
  });

  it('accepts a correlation id at the existing length limit and rejects longer values', () => {
    expect(HttpCorrelationMapper.map({ correlationId: 'a'.repeat(200) })).toEqual({
      correlation_id: 'a'.repeat(200),
    });
    expect(HttpCorrelationMapper.map({ correlationId: 'a'.repeat(201) })).toEqual({});
  });
});
