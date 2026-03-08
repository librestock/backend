import { BadRequestException, type PipeTransform } from '@nestjs/common';
import { ErrorCode } from '@librestock/types/common'

interface SafeParseSuccess<T> {
  success: true;
  data: T;
}

interface SafeParseFailure {
  success: false;
  error: {
    issues: unknown[];
  };
}

interface ZodLikeSchema<T> {
  safeParse(value: unknown): SafeParseSuccess<T> | SafeParseFailure;
}

export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodLikeSchema<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        code: ErrorCode.BAD_REQUEST,
        message: 'Validation failed',
        errors: result.error.issues,
      });
    }

    return result.data;
  }
}
