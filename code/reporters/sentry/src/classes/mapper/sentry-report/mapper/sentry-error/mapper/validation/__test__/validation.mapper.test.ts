import { ValidationError } from 'class-validator';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ValidationMapper } from '..';
import { DiagnosticValueSerializer } from '../../../serializer/diagnostic-value';

const validationError = (property: string, constraints: Record<string, string>) =>
  Object.assign(new ValidationError(), { property, constraints });

afterEach(() => vi.restoreAllMocks());

describe('ValidationMapper', () => {
  it('builds the summary from source constraints independently of their serialized keys', () => {
    vi.spyOn(DiagnosticValueSerializer, 'flatten').mockReturnValue({ encodedConstraint: 'must be a string' });
    const error = validationError('nextCursor', { isString: 'must be a string' });

    const mapped = ValidationMapper.map([error], 'cause');

    expect(mapped.message).toBe('Validation failed: nextCursor (isString)');
    expect(mapped.fields).toEqual([
      expect.objectContaining({ source: 'cause', path: 'nextCursor', encodedConstraint: 'must be a string' }),
    ]);
  });

  it('limits the summary while keeping all diagnostic fields', () => {
    const errors = Array.from({ length: 7 }, (_, index) =>
      validationError(`field${index}`, { required: 'must be defined' }),
    );

    const mapped = ValidationMapper.map(errors, 'root');

    expect(mapped.message).toBe(
      'Validation failed: field0 (required); field1 (required); field2 (required); field3 (required); field4 (required); …',
    );
    expect(mapped.fields).toHaveLength(7);
    expect(mapped.fields[6]).toMatchObject({ path: 'field6', 'constraints.required': 'must be defined' });
  });

  it('recognizes only nonempty arrays of framework validation instances', () => {
    const error = validationError('field', { required: 'must be defined' });

    expect(ValidationMapper.supports([error])).toBe(true);
    expect(ValidationMapper.supports([])).toBe(false);
    expect(ValidationMapper.supports([{ property: 'field' }])).toBe(false);
    expect(ValidationMapper.supports([error, new Error('Other failure')])).toBe(false);
  });
});
