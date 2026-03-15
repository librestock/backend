import type { LocationResponseDto } from '@librestock/types/locations';
import type { Location } from './entities/location.entity';

export function toLocationResponseDto(location: Location): LocationResponseDto {
  return {
    id: location.id,
    name: location.name,
    type: location.type,
    address: location.address,
    contact_person: location.contact_person,
    phone: location.phone,
    is_active: location.is_active,
    created_at: location.created_at,
    updated_at: location.updated_at,
  };
}
