import { OrderStatus } from './order-status.enum';
import type { ClientId } from '../common/entity-id.type'

export interface OrderQueryType {
  page?: number;
  limit?: number;
  q?: string;
  client_id?: ClientId;
  status?: OrderStatus;
  date_from?: string;
  date_to?: string;
}
