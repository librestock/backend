import { Effect, type Tracer } from 'effect';

type AnyEffect = Effect.Effect<any, any, any>;

export interface TraceAttributeCatalog {
  readonly categoryId: string;
  readonly clientId: string;
  readonly entityId: string;
  readonly id: string;
  readonly locationId: string;
  readonly orderId: string;
  readonly parentId: string;
  readonly productId: string;
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
  id: {
    type: 'string',
    cardinality: 'high',
    description: 'Primary identifier for the resource addressed by the method',
  },
  locationId: {
    type: 'string',
    cardinality: 'high',
    description: 'Location identifier involved in the operation',
  },
  orderId: {
    type: 'string',
    cardinality: 'high',
    description: 'Order identifier involved in the operation',
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
  'id',
  'locationId',
  'orderId',
  'parentId',
  'productId',
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

export const makeServiceTracer = (serviceName: string) => {
  const span = (methodName: string, options?: TraceSpanOptions) =>
    Effect.withSpan(`${serviceName}.${methodName}`, options);

  const traced = <Args extends Array<any>, Ret extends AnyEffect>(
    methodName: string,
    body: (...args: Args) => Ret,
    options?: ServiceMethodSpanResolver<Args>,
  ) =>
    Effect.functionWithSpan({
      body,
      options: (...args) => ({
        name: `${serviceName}.${methodName}`,
        ...(typeof options === 'function' ? options(...args) : options),
      }),
    });

  return { span, traced };
};
