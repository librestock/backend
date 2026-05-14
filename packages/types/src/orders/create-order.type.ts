import type { ClientId, ProductId } from '../common/entity-id.type'

export interface CreateOrderItemType {
  product_id: ProductId
  quantity: number
  unit_price: number
  notes?: string
}

export interface CreateOrderType {
  client_id: ClientId
  delivery_address: string
  delivery_deadline?: string
  yacht_name?: string
  special_instructions?: string
  items: CreateOrderItemType[]
}
