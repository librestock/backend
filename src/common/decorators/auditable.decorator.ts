import { SetMetadata } from '@nestjs/common';
import { type AuditAction, type AuditEntityType } from '../enums';

export const AUDIT_METADATA_KEY = 'audit_metadata';

export interface AuditMetadata {
  action: AuditAction;
  entityType: AuditEntityType;
  entityIdParam?: string;
  entityIdFromBody?: string;
  entityIdFromResponse?: string;
  trackChanges?: boolean;
}

export const Auditable = (metadata: AuditMetadata) =>
  SetMetadata(AUDIT_METADATA_KEY, metadata);
