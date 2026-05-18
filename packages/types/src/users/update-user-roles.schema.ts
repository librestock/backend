import { Schema } from 'effect';

export const UpdateUserRolesSchema = Schema.Struct({
  roles: Schema.Array(Schema.UUID),
}).annotations({ identifier: 'UpdateUserRoles' });

export type UpdateUserRoles = Schema.Schema.Type<typeof UpdateUserRolesSchema>;
