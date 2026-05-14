import type { AreaId, LocationId } from '../common/entity-id.type'

export interface UpdateInventoryDto {
  location_id?: LocationId
  area_id?: AreaId | null
  quantity?: number
  batchNumber?: string
  expiry_date?: string | null
  cost_per_unit?: number | null
  received_date?: string | null
}
