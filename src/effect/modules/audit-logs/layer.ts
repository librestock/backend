import { Layer } from 'effect';
import { AuditLogsRepository, makeAuditLogsRepository } from './repository';
import { AuditLogsService, makeAuditLogsService } from './service';

export const auditLogsRepositoryLayer = Layer.effect(
  AuditLogsRepository,
  makeAuditLogsRepository,
);

export const auditLogsLayer = Layer.effect(
  AuditLogsService,
  makeAuditLogsService,
).pipe(Layer.provide(auditLogsRepositoryLayer));
