import { Schema } from 'effect';

export const PhotoIdSchema = Schema.UUID.annotations({ identifier: 'PhotoId' });
export const PhotoProductIdSchema = Schema.UUID.annotations({
  identifier: 'PhotoProductId',
});
