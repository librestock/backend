import { Effect } from 'effect';
import type { AreaResponseDto } from './dto';
import type { Area } from './entities/area.entity';
import { AreasInfrastructureError } from './areas.errors';

export const areaTryAsync = <A>(action: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) =>
      new AreasInfrastructureError({
        action,
        cause,
        message: `Areas service failed to ${action}`,
      }),
  });

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
