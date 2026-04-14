import { Cause, Effect, Option, type Tracer } from 'effect';
import { CurrentRequestContext } from './request-context';

type AnyEffect = Effect.Effect<any, any, any>;

export type TraceModule = 'auth' | 'users' | 'orders' | 'health';
export type TraceLayer = 'service';
export type TraceEntityType = 'user' | 'order';
export type TraceOutcome =
  | 'success'
  | 'not_found'
  | 'validation_error'
  | 'failure';

export interface TraceAttributeCatalog {
  readonly categoryId: string;
  readonly clientId: string;
  readonly entityId: string;
  readonly entityType: TraceEntityType;
  readonly errorType: string;
  readonly id: string;
  readonly layer: TraceLayer;
  readonly locationId: string;
  readonly module: TraceModule;
  readonly operation: string;
  readonly orderId: string;
  readonly outcome: TraceOutcome;
  readonly parentId: string;
  readonly productId: string;
  readonly requestId: string;
  readonly userId: string;
}

type TraceAttributeType = 'string' | 'number' | 'boolean';
type TraceAttributeCardinality = 'low' | 'high';

interface TraceAttributeDefinition {
  readonly type: TraceAttributeType;
  readonly cardinality: TraceAttributeCardinality;
  readonly description: string;
}

export const TRACE_ATTRIBUTE_DEFINITIONS = {
  categoryId: {
    type: 'string',
    cardinality: 'high',
    description: 'Category identifier involved in the operation',
  },
  clientId: {
    type: 'string',
    cardinality: 'high',
    description: 'Client identifier involved in the operation',
  },
  entityId: {
    type: 'string',
    cardinality: 'high',
    description: 'Generic entity identifier for audit/history style lookups',
  },
  entityType: {
    type: 'string',
    cardinality: 'low',
    description:
      'Domain entity the operation primarily acts on; dashboard-safe grouping key',
  },
  errorType: {
    type: 'string',
    cardinality: 'low',
    description:
      'Tagged error name set by the helper on failure spans (or "Defect" for unexpected errors)',
  },
  id: {
    type: 'string',
    cardinality: 'high',
    description:
      'Primary identifier for the resource addressed by the method (transitional; prefer semantic *Id fields)',
  },
  layer: {
    type: 'string',
    cardinality: 'low',
    description:
      'Architectural layer the span represents; dashboard-safe grouping key',
  },
  locationId: {
    type: 'string',
    cardinality: 'high',
    description: 'Location identifier involved in the operation',
  },
  module: {
    type: 'string',
    cardinality: 'low',
    description:
      'Feature module the span belongs to; dashboard-safe grouping key',
  },
  operation: {
    type: 'string',
    cardinality: 'low',
    description:
      'Service method name; dashboard-safe grouping key (auto-derived from the method)',
  },
  orderId: {
    type: 'string',
    cardinality: 'high',
    description: 'Order identifier involved in the operation',
  },
  outcome: {
    type: 'string',
    cardinality: 'low',
    description:
      'Classification of the span result set automatically by the helper',
  },
  parentId: {
    type: 'string',
    cardinality: 'high',
    description: 'Parent resource identifier involved in the operation',
  },
  productId: {
    type: 'string',
    cardinality: 'high',
    description: 'Product identifier involved in the operation',
  },
  requestId: {
    type: 'string',
    cardinality: 'high',
    description:
      'Request identifier auto-attached by the helper when CurrentRequestContext is in scope',
  },
  userId: {
    type: 'string',
    cardinality: 'high',
    description: 'User identifier involved in the operation',
  },
} as const satisfies Record<
  keyof TraceAttributeCatalog,
  TraceAttributeDefinition
>;

export const TRACE_ATTRIBUTE_KEYS = [
  'categoryId',
  'clientId',
  'entityId',
  'entityType',
  'errorType',
  'id',
  'layer',
  'locationId',
  'module',
  'operation',
  'orderId',
  'outcome',
  'parentId',
  'productId',
  'requestId',
  'userId',
] as const satisfies ReadonlyArray<keyof TraceAttributeCatalog>;

export type TraceAttributeKey = (typeof TRACE_ATTRIBUTE_KEYS)[number];

export type TraceAttributes = Partial<TraceAttributeCatalog>;

export type TraceSpanOptions = Omit<
  Tracer.SpanOptions,
  'attributes' | 'captureStackTrace'
> & {
  readonly attributes?: TraceAttributes;
};

type ServiceMethodSpanResolver<Args extends Array<any>> =
  | TraceSpanOptions
  | ((...args: Args) => TraceSpanOptions | undefined);

export interface ServiceTracerConfig {
  readonly serviceName: string;
  readonly module: TraceModule;
  readonly layer: TraceLayer;
  readonly entityType?: TraceEntityType;
}

interface CauseClassification {
  readonly outcome: TraceOutcome;
  readonly errorType: string;
}

const classifyCause = (
  cause: Cause.Cause<unknown>,
): CauseClassification | undefined => {
  const failure = Cause.failureOption(cause);
  if (Option.isSome(failure)) {
    const error = failure.value as {
      readonly _tag?: string;
      readonly statusCode?: number;
    };
    const errorType = error._tag ?? 'UnknownError';
    const statusCode = error.statusCode;
    if (statusCode === 404 || errorType.endsWith('NotFound')) {
      return { outcome: 'not_found', errorType };
    }
    if (statusCode === 400) {
      return { outcome: 'validation_error', errorType };
    }
    return { outcome: 'failure', errorType };
  }

  if (Option.isSome(Cause.dieOption(cause))) {
    return { outcome: 'failure', errorType: 'Defect' };
  }

  return undefined;
};

const attachRequestId = Effect.flatMap(
  Effect.serviceOption(CurrentRequestContext),
  Option.match({
    onNone: () => Effect.void,
    onSome: (ctx) => Effect.annotateCurrentSpan({ requestId: ctx.requestId }),
  }),
);

const withAttribution = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  attachRequestId.pipe(
    Effect.andThen(() =>
      effect.pipe(
        Effect.tap(() => Effect.annotateCurrentSpan({ outcome: 'success' })),
        Effect.tapErrorCause((cause) => {
          const classification = classifyCause(cause);
          return classification
            ? Effect.annotateCurrentSpan({
                outcome: classification.outcome,
                errorType: classification.errorType,
              })
            : Effect.void;
        }),
      ),
    ),
  );

export const makeServiceTracer = (config: ServiceTracerConfig) => {
  const { serviceName, module, layer, entityType } = config;

  const mergeAttributes = (
    methodName: string,
    methodAttributes: TraceAttributes | undefined,
  ): TraceAttributes => ({
    module,
    layer,
    operation: methodName,
    ...(entityType !== undefined ? { entityType } : {}),
    ...methodAttributes,
  });

  const span =
    (methodName: string, options?: TraceSpanOptions) =>
    <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
      withAttribution(effect).pipe(
        Effect.withSpan(`${serviceName}.${methodName}`, {
          ...options,
          attributes: mergeAttributes(methodName, options?.attributes),
        }),
      );

  const traced = <Args extends Array<any>, Ret extends AnyEffect>(
    methodName: string,
    body: (...args: Args) => Ret,
    options?: ServiceMethodSpanResolver<Args>,
  ) =>
    Effect.functionWithSpan({
      body: (...args: Args) => withAttribution(body(...args)) as Ret,
      options: (...args) => {
        const resolved =
          typeof options === 'function' ? options(...args) : options;
        return {
          name: `${serviceName}.${methodName}`,
          ...resolved,
          attributes: mergeAttributes(methodName, resolved?.attributes),
        };
      },
    });

  return { span, traced };
};
