import type { AreaResponseDto } from '@librestock/types/areas';
import type { areas } from '../../platform/db/schema';

type AreaRow = typeof areas.$inferSelect;
type Area = AreaRow & {
  children?: Area[];
};

export function toAreaResponseDto(area: Area): AreaResponseDto {
  return {
    id: area.id,
    location_id: area.location_id,
    parent_id: area.parent_id,
    name: area.name,
    code: area.code,
    description: area.description,
    is_active: area.is_active,
    created_at: area.created_at,
    updated_at: area.updated_at,
    children: area.children?.map(toAreaResponseDto),
  };
}
