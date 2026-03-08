import { BadRequestException } from '@nestjs/common';
import { ErrorCode } from '@librestock/types/common'
import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  it('returns parsed data when schema validation succeeds', () => {
    const pipe = new ZodValidationPipe<{ name: string }>({
      safeParse: (value) => ({
        success: true,
        data: value as { name: string },
      }),
    });

    expect(pipe.transform({ name: 'Marine Pump' })).toEqual({
      name: 'Marine Pump',
    });
  });

  it('throws BadRequestException with issues when schema validation fails', () => {
    const issues = [
      {
        path: ['name'],
        message: 'Required',
      },
    ];

    const pipe = new ZodValidationPipe<{ name: string }>({
      safeParse: () => ({
        success: false,
        error: { issues },
      }),
    });

    try {
      pipe.transform({});
      fail('Expected pipe to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as Record<string, unknown>;
      expect(response.code).toBe(ErrorCode.BAD_REQUEST);
      expect(response.message).toBe('Validation failed');
      expect(response.errors).toEqual(issues);
    }
  });
});
