import { Data } from 'effect';
import type { OrderStatus } from '@librestock/types/orders';

export class OrderNotFound extends Data.TaggedError('OrderNotFound')<{
  readonly id: string;
  readonly message: string;
}> {
  readonly statusCode = 404 as const;
}

export class ClientNotFound extends Data.TaggedError('ClientNotFound')<{
  readonly clientId: string;
  readonly message: string;
}> {
  readonly statusCode = 400 as const;
}

export class ProductNotFound extends Data.TaggedError('ProductNotFound')<{
  readonly productId: string;
  readonly message: string;
}> {
  readonly statusCode = 400 as const;
}

export class InvalidOrderStatusTransition extends Data.TaggedError(
  'InvalidOrderStatusTransition',
)<{
  readonly from: OrderStatus;
  readonly to: OrderStatus;
  readonly message: string;
}> {
  readonly statusCode = 400 as const;
}

export class CannotDeleteNonDraftOrder extends Data.TaggedError(
  'CannotDeleteNonDraftOrder',
)<{
  readonly orderId: string;
  readonly status: OrderStatus;
  readonly message: string;
}> {
  readonly statusCode = 400 as const;
}

export class OrdersInfrastructureError extends Data.TaggedError(
  'OrdersInfrastructureError',
)<{
  readonly action: string;
  readonly message: string;
  readonly cause?: unknown;
}> {
  readonly statusCode = 500 as const;
}
