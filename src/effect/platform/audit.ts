import { Context, Effect, Layer } from 'effect';
import {
  type AuditAction,
  type AuditEntityType,
} from '@librestock/types/audit-logs';
import { DrizzleDatabase } from './drizzle';
import { auditLogs } from './db/schema';
import type { LogPayload } from './messages';
import { getOptionalSession } from './session';
import { getRequestContext } from './request-context';

export interface AuditWriteParams {
  readonly action: AuditAction;
  readonly entityType: AuditEntityType;
  readonly entityId: string;
}

export interface AuditLogWriter {
  readonly log: (
    params: AuditWriteParams,
  ) => Effect.Effect<void, never, unknown>;
}

export const AuditLogWriter = Context.GenericTag<AuditLogWriter>(
  '@librestock/effect/AuditLogWriter',
);

export const makeAuditLogWriter = Effect.gen(function* () {
  const db = yield* DrizzleDatabase;

  const writeAuditLog = (params: AuditWriteParams) =>
    Effect.gen(function* () {
      const session = yield* getOptionalSession;
      const requestContext = yield* getRequestContext;

      yield* Effect.tryPromise({
        try: () =>
          db.insert(auditLogs).values({
            user_id: session?.user.id ?? null,
            action: params.action,
            entity_type: params.entityType,
            entity_id: params.entityId,
            changes: null,
            ip_address: requestContext.ip,
            user_agent: null,
          }),
        catch: (cause) => cause,
      }).pipe(
        Effect.catchAll((cause) =>
          Effect.logError({
            messageKey: 'audit.writeFailed',
            action: params.action,
            entityType: params.entityType,
            entityId: params.entityId,
            cause,
          } satisfies LogPayload),
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
