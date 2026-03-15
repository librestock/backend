import { Schema } from 'effect';

const CategoryNameSchema = Schema.Trim.pipe(
  Schema.minLength(1),
  Schema.maxLength(100),
);

const CategoryDescriptionSchema = Schema.NullOr(
  Schema.String.pipe(Schema.maxLength(500)),
);

export const CategoryIdSchema = Schema.UUID.annotations({
  identifier: 'CategoryId',
});

export const CreateCategorySchema = Schema.Struct({
  name: CategoryNameSchema,
  parent_id: Schema.optional(Schema.NullOr(Schema.UUID)),
  description: Schema.optional(CategoryDescriptionSchema),
}).annotations({ identifier: 'CreateCategory' });

export const UpdateCategorySchema = Schema.Struct({
  name: Schema.optional(CategoryNameSchema),
  parent_id: Schema.optional(Schema.NullOr(Schema.UUID)),
  description: Schema.optional(CategoryDescriptionSchema),
}).annotations({ identifier: 'UpdateCategory' });
