import { ValidationError } from 'class-validator';

import { DiagnosticValueSerializer } from '../../serializer/diagnostic-value';

const MAX_DEPTH = 20;
const MAX_FIELDS = 200;
const MAX_SUMMARY_FIELDS = 5;

interface ValidationMapping {
  readonly fields: Record<string, unknown>[];
  readonly message: string;
}

export class ValidationMapper {
  static supports(value: unknown): value is ValidationError[] {
    return Array.isArray(value) && value.length > 0 && value.every((error) => error instanceof ValidationError);
  }

  static map(errors: ValidationError[], source: string): ValidationMapping {
    const fields: Record<string, unknown>[] = [];
    const summary: string[] = [];
    const ancestors = new Set<ValidationError>();

    const addField = (path: string, details: Record<string, unknown>, constraints: string[] = []): void => {
      fields.push({ source, path, ...details });
      if (summary.length < MAX_SUMMARY_FIELDS) {
        summary.push(`${path}${constraints.length ? ` (${constraints.join(', ')})` : ''}`);
      }
    };

    const visit = (error: ValidationError, parentPath: string): void => {
      const path = parentPath ? `${parentPath}.${error.property}` : error.property;
      if (ancestors.has(error)) {
        addField(path, { truncated: '[Circular validation error]' });
        return;
      }
      if (ancestors.size >= MAX_DEPTH || fields.length >= MAX_FIELDS) {
        addField(path, { truncated: '[Validation diagnostic limit]' });
        return;
      }

      ancestors.add(error);
      const constraints = error.constraints ?? {};
      if (Object.keys(constraints).length > 0 || !error.children?.length) {
        addField(
          path,
          {
            target: error.target?.constructor.name ?? '[unknown]',
            value: DiagnosticValueSerializer.serialize(error.value),
            valueType: error.value === null ? 'null' : Array.isArray(error.value) ? 'array' : typeof error.value,
            ...DiagnosticValueSerializer.flatten(constraints, 'constraints'),
            ...(error.contexts ? DiagnosticValueSerializer.flatten(error.contexts, 'contexts') : {}),
          },
          Object.keys(constraints),
        );
      }
      for (const child of error.children ?? []) {
        visit(child, path);
        if (fields.length > MAX_FIELDS) break;
      }
      ancestors.delete(error);
    };

    for (const error of errors) {
      visit(error, '');
      if (fields.length > MAX_FIELDS) break;
    }

    return {
      fields,
      message: `Validation failed: ${summary.join('; ')}${fields.length > MAX_SUMMARY_FIELDS ? '; …' : ''}`,
    };
  }
}
