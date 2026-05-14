import { z } from 'zod/v4'

const DIMENSIONS_PATTERN = /^\d+(\.\d+)?x\d+(\.\d+)?x\d+(\.\d+)?$/;

function toNullableTrimmedString(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

const nullableTrimmedString = (maxLength: number) =>
  z.preprocess(
    toNullableTrimmedString,
    z.union([z.string().max(maxLength), z.null()]).optional(),
  );

const nullableNonNegativeNumber = z
  .number()
  .nonnegative()
  .nullable()
  .optional();

export const CreateProductBaseSchema = z.object({
    sku: z.string().trim().min(1).max(50),
    name: z.string().trim().min(1).max(200),
    description: nullableTrimmedString(1000),
    category_id: z.string().uuid(),
    volume_ml: z.number().min(1).nullable().optional(),
    weight_kg: nullableNonNegativeNumber,
    dimensions_cm: z
      .preprocess(
        toNullableTrimmedString,
        z
          .union([z.string().regex(DIMENSIONS_PATTERN), z.null()])
          .optional(),
      ),
    standard_cost: nullableNonNegativeNumber,
    standard_price: nullableNonNegativeNumber,
    markup_percentage: z.number().min(0).max(1000).nullable().optional(),
    reorder_point: z.number().nonnegative(),
    primary_supplier_id: z
      .union([z.string().uuid(), z.null()])
      .optional(),
    supplier_sku: nullableTrimmedString(50),
    barcode: nullableTrimmedString(100),
    unit: nullableTrimmedString(50),
    is_active: z.boolean(),
    is_perishable: z.boolean(),
    notes: nullableTrimmedString(500),
  });

export const CreateProductSchema = CreateProductBaseSchema.superRefine((dto, ctx) => {
  if (
    dto.standard_cost != null &&
    dto.standard_price != null &&
    dto.standard_price < dto.standard_cost
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['standard_price'],
      message: 'Standard price must be greater than or equal to standard cost',
    });
  }
});
