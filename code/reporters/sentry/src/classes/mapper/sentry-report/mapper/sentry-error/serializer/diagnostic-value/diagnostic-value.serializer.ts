type DiagnosticValue = string | number | boolean | null;

const MAX_DEPTH = 8;
const MAX_FIELDS = 200;

export class DiagnosticValueSerializer {
  /** Flat scalar fields survive the SDK's default normalization depth. Accessors are never invoked. */
  static flatten(value: unknown, prefix = ''): Record<string, DiagnosticValue> {
    const fields: Record<string, DiagnosticValue> = {};
    const ancestors = new Set<object>();

    const visit = (current: unknown, path: string, depth: number): void => {
      if (Object.keys(fields).length >= MAX_FIELDS) {
        fields['[truncated]'] = `More than ${MAX_FIELDS} diagnostic fields`;
        return;
      }
      if (typeof current !== 'object' || current === null) {
        fields[path] = this.scalarValue(current);
        return;
      }
      if (ancestors.has(current)) {
        fields[path] = '[Circular]';
        return;
      }
      if (depth >= MAX_DEPTH) {
        fields[path] = `[Maximum depth: ${MAX_DEPTH}]`;
        return;
      }
      if (current instanceof Date) {
        fields[path] = Number.isNaN(current.getTime()) ? 'Invalid Date' : current.toISOString();
        return;
      }

      ancestors.add(current);
      try {
        const properties = Object.entries(Object.getOwnPropertyDescriptors(current)).filter(
          ([key]) => !Array.isArray(current) || key !== 'length',
        );
        if (properties.length === 0) fields[path] = Array.isArray(current) ? '[]' : '{}';
        for (const [key, property] of properties) {
          const childPath = Array.isArray(current) ? `${path}[${key}]` : path ? `${path}.${key}` : key;
          if ('value' in property) visit(property.value, childPath, depth + 1);
          else fields[childPath] = '[Accessor]';
          if (Object.keys(fields).length > MAX_FIELDS) break;
        }
      } catch {
        fields[path] = '[Unreadable object]';
      } finally {
        ancestors.delete(current);
      }
    };

    visit(value, prefix, 0);
    return fields;
  }

  static serialize(value: unknown): DiagnosticValue {
    if (typeof value !== 'object' || value === null) return this.scalarValue(value);
    return JSON.stringify(this.flatten(value));
  }

  private static scalarValue(value: unknown): DiagnosticValue {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
    if (typeof value === 'number') return Number.isFinite(value) ? value : String(value);
    if (value === undefined) return '[undefined]';
    if (typeof value === 'bigint') return `${value}n`;
    if (typeof value === 'function') return `[Function: ${value.name}]`;
    return String(value);
  }
}
