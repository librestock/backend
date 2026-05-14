import { Schema } from 'effect'

export const PageSchema = Schema.NumberFromString.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(1),
)

export const LimitSchema = Schema.NumberFromString.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(1),
  Schema.lessThanOrEqualTo(100),
)

export const PositiveIntSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(1),
)

export const NonNegativeNumberSchema = Schema.Number.pipe(Schema.nonNegative())

export const NullableTrimmedString = Schema.NullOr(Schema.Trim)

export const NullableMaxLength200String = Schema.NullOr(
  Schema.Trim.pipe(Schema.maxLength(200)),
)

export const EmailSchema = Schema.Trim.pipe(
  Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
)
