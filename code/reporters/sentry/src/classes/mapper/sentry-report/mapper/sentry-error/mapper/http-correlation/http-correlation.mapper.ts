// Backend Activity.Id may contain a W3C traceparent rather than just its trace-id.
const TRACE_ID_PATTERN = /^(?:[\da-f]{2}-([\da-f]{32})-[\da-f]{16}-[\da-f]{2}|([\da-f]{32}))$/i;
const MAX_TAG_VALUE_LENGTH = 200;

export class HttpCorrelationMapper {
  static map(response: unknown): Record<string, string> {
    if (typeof response !== 'object' || response === null) return {};

    const tags: Record<string, string> = {};
    const traceId = Reflect.get(response, 'traceId');
    const match = typeof traceId === 'string' ? TRACE_ID_PATTERN.exec(traceId.trim()) : null;
    const otelTraceId = match?.[1] ?? match?.[2];
    if (otelTraceId) tags.otel_trace_id = otelTraceId.toLowerCase();

    const correlationId = Reflect.get(response, 'correlationId');
    if (typeof correlationId === 'string') {
      const value = correlationId.trim();
      if (value.length > 0 && value.length <= MAX_TAG_VALUE_LENGTH) tags.correlation_id = value;
    }
    return tags;
  }
}
