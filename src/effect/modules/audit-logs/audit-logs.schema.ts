import { Schema } from 'effect';
import { LimitSchema, PageSchema } from '@librestock/types/common';
import { AuditAction, AuditEntityType } from '@librestock/types/audit-logs';

const AuditEntityTypeValues = [
  AuditEntityType.PRODUCT,
  AuditEntityType.CATEGORY,
  AuditEntityType.SUPPLIER,
  AuditEntityType.LOCATION,
  AuditEntityType.AREA,
  AuditEntityType.CLIENT,
  AuditEntityType.INVENTORY,
  AuditEntityType.ROLE,
  AuditEntityType.STOCK_MOVEMENT,
  AuditEntityType.ORDER,
  AuditEntityType.ORDER_ITEM,
  AuditEntityType.PHOTO,
] as const;
export const AuditEntityTypeSchema = Schema.Literal(...AuditEntityTypeValues);

const AuditActionValues = [
  AuditAction.CREATE,
  AuditAction.UPDATE,
  AuditAction.DELETE,
  AuditAction.RESTORE,
  AuditAction.ADD_PHOTO,
  AuditAction.STATUS_CHANGE,
  AuditAction.ADJUST_QUANTITY,
] as const;

export const AuditLogIdSchema = Schema.UUID.annotations({ identifier: 'AuditLogId' });

export const AuditLogQuerySchema = Schema.Struct({
  page: Schema.optionalWith(PageSchema, { default: () => 1 }),
  limit: Schema.optionalWith(LimitSchema, { default: () => 20 }),
  entity_type: Schema.optional(AuditEntityTypeSchema),
  entity_id: Schema.optional(Schema.UUID),
  user_id: Schema.optional(Schema.UUID),
  action: Schema.optional(Schema.Literal(...AuditActionValues)),
  from_date: Schema.optional(Schema.DateFromString),
  to_date: Schema.optional(Schema.DateFromString),
}).annotations({ identifier: 'AuditLogQuery' });
