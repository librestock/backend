import { Context, Effect, Layer } from 'effect';
import { type AuditAction, type AuditEntityType } from '@librestock/types/audit-logs';
import { TypeOrmDataSource } from './typeorm';
import { getOptionalSession } from './session';
import { getRequestContext } from './request-context';

export interface AuditWriteParams {
  readonly action: AuditAction;
  readonly entityType: AuditEntityType;
  readonly entityId: string;
}

export interface AuditLogWriter {
  readonly log: (params: AuditWriteParams) => Effect.Effect<void, never, unknown>;
}

export const AuditLogWriter = Context.GenericTag<AuditLogWriter>(
  '@librestock/effect/AuditLogWriter',
);

export const makeAuditLogWriter = Effect.gen(function* () {
  const dataSource = yield* TypeOrmDataSource;

  const writeAuditLog = (params: AuditWriteParams) =>
    Effect.gen(function* () {
      const session = yield* getOptionalSession;
      const requestContext = yield* getRequestContext;

      yield* Effect.tryPromise({
        try: () =>
          dataSource.query(
            `INSERT INTO audit_logs (
               user_id,
               action,
               entity_type,
               entity_id,
               changes,
               ip_address,
               user_agent
             ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              session?.user.id ?? null,
              params.action,
              params.entityType,
              params.entityId,
              null,
              requestContext.ip,
              null,
            ],
          ),
        catch: (cause) => cause,
      }).pipe(
        Effect.catchAll((cause) =>
          Effect.sync(() => {
            console.error('[effect-audit] Failed to write audit log', cause);
          }),
        ),
        Effect.asVoid,
      );
    });

  return {
    log: (params) =>
      Effect.gen(function* () {
        yield* Effect.forkDaemon(writeAuditLog(params));
      }).pipe(Effect.asVoid),
  } satisfies AuditLogWriter;
});

export const auditLayer = Layer.effect(AuditLogWriter, makeAuditLogWriter);
