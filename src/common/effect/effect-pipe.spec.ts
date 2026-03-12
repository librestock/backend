import { BadRequestException } from '@nestjs/common';
import { Schema } from 'effect';
import { EffectPipe } from './effect-pipe';

describe('EffectPipe', () => {
  const TestSchema = Schema.Struct({
    name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
    count: Schema.Number.pipe(Schema.int(), Schema.positive()),
  });

  const pipe = new EffectPipe(TestSchema);

  it('returns the decoded value for valid input', () => {
    const result = pipe.transform({ name: 'Widget', count: 5 });
    expect(result).toEqual({ name: 'Widget', count: 5 });
  });

  it('strips unknown properties', () => {
    const result = pipe.transform({ name: 'Widget', count: 5, extra: true } as never);
    expect(result).toEqual({ name: 'Widget', count: 5 });
  });

  it('throws BadRequestException for invalid input', () => {
    expect(() => pipe.transform({ name: '', count: -1 })).toThrow(
      BadRequestException,
    );
  });

  it('throws BadRequestException for wrong types', () => {
    expect(() => pipe.transform({ name: 123, count: 'abc' } as never)).toThrow(
      BadRequestException,
    );
  });

  it('throws BadRequestException for null input', () => {
    expect(() => pipe.transform(null as never)).toThrow(BadRequestException);
  });

  describe('with Schema.UUID', () => {
    const uuidPipe = new EffectPipe(Schema.UUID);

    it('accepts a valid UUID', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      expect(uuidPipe.transform(uuid)).toBe(uuid);
    });

    it('rejects an invalid UUID', () => {
      expect(() => uuidPipe.transform('not-a-uuid')).toThrow(
        BadRequestException,
      );
    });
  });
});
