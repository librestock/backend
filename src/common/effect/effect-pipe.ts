import {
  PipeTransform,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { Schema, ParseResult } from 'effect';
import { TreeFormatter } from 'effect/ParseResult';

/**
 * NestJS pipe that validates and decodes input using an Effect Schema.
 *
 * Replaces class-validator for routes that adopt Effect Schema DTOs.
 * On parse failure, throws a NestJS BadRequestException with structured
 * validation error messages — matching the existing error response shape.
 *
 * Usage in a controller:
 *   @Post()
 *   create(@Body(new EffectPipe(CreateProductSchema)) dto: CreateProduct) { ... }
 *
 * Or for params:
 *   @Get(':id')
 *   findOne(@Param('id', new EffectPipe(Schema.UUID)) id: string) { ... }
 */
@Injectable()
export class EffectPipe<A, I = unknown> implements PipeTransform<I, A> {
  private readonly decode: (input: unknown) => A;

  constructor(private readonly schema: Schema.Schema<A, I>) {
    this.decode = Schema.decodeUnknownSync(this.schema, { errors: 'all' });
  }

  transform(value: I): A {
    try {
      return this.decode(value);
    } catch (error: unknown) {
      if (ParseResult.isParseError(error)) {
        const formatted = TreeFormatter.formatErrorSync(error);
        throw new BadRequestException(formatted);
      }
      throw new BadRequestException('Validation failed');
    }
  }
}
