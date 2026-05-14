import { z } from 'zod/v4'
import { CreateProductBaseSchema } from './create-product.schema'

export const UpdateProductSchema = CreateProductBaseSchema.partial().superRefine(
  (dto, ctx) => {
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
  },
);
