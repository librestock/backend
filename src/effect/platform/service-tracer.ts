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
