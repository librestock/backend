export type EntityId<Brand extends string> = Brand extends string ? string : never

export type ProductId = EntityId<'ProductId'>
export type LocationId = EntityId<'LocationId'>
export type InventoryId = EntityId<'InventoryId'>
export type OrderId = EntityId<'OrderId'>
export type OrderItemId = EntityId<'OrderItemId'>
export type CategoryId = EntityId<'CategoryId'>
export type SupplierId = EntityId<'SupplierId'>
export type AreaId = EntityId<'AreaId'>
export type ClientId = EntityId<'ClientId'>
export type UserId = EntityId<'UserId'>
export type StockMovementId = EntityId<'StockMovementId'>

export function asEntityId<Brand extends string>(value: string): EntityId<Brand> {
  return value as EntityId<Brand>
}

export function asProductId(value: string): ProductId {
  return value as ProductId
}

export function asLocationId(value: string): LocationId {
  return value as LocationId
}

export function asInventoryId(value: string): InventoryId {
  return value as InventoryId
}

export function asOrderId(value: string): OrderId {
  return value as OrderId
}

export function asCategoryId(value: string): CategoryId {
  return value as CategoryId
}

export function asSupplierId(value: string): SupplierId {
  return value as SupplierId
}

export function asAreaId(value: string): AreaId {
  return value as AreaId
}

export function asClientId(value: string): ClientId {
  return value as ClientId
}

export function asUserId(value: string): UserId {
  return value as UserId
}

export function asStockMovementId(value: string): StockMovementId {
  return value as StockMovementId
}
