import { Effect } from 'effect';
import type { LocationResponseDto } from './dto';
import type { Location } from './entities/location.entity';
import { LocationsInfrastructureError } from './locations.errors';

export const locationTryAsync = <A>(action: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) =>
      new LocationsInfrastructureError({
        action,
        cause,
        message: `Locations service failed to ${action}`,
      }),
  });

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
