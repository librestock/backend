import { Data } from 'effect';
import type { OrderStatus } from '@librestock/types/orders';

export class FulfillmentOrderNotFound extends Data.TaggedError(
  'FulfillmentOrderNotFound',
)<{
  readonly orderId: string;
  readonly message: string;
}> {
  readonly statusCode = 404 as const;
}

export class FulfillmentInvalidTransition extends Data.TaggedError(
  'FulfillmentInvalidTransition',
)<{
  readonly orderId: string;
  readonly from: OrderStatus;
  readonly to: OrderStatus;
  readonly message: string;
}> {
  readonly statusCode = 400 as const;
}

export class FulfillmentNotImplemented extends Data.TaggedError(
  'FulfillmentNotImplemented',
)<{
  readonly operation: string;
  readonly message: string;
}> {
  readonly statusCode = 501 as const;
}

export class FulfillmentInfrastructureError extends Data.TaggedError(
  'FulfillmentInfrastructureError',
)<{
  readonly action: string;
  readonly message: string;
  readonly cause?: unknown;
}> {
  readonly statusCode = 500 as const;
}

export type FulfillmentError =
  | FulfillmentOrderNotFound
  | FulfillmentInvalidTransition
  | FulfillmentNotImplemented
  | FulfillmentInfrastructureError;
