import { Effect } from 'effect';
import type { PhotoResponseDto } from './dto';
import type { Photo } from './entities/photo.entity';
import { PhotosInfrastructureError } from './photos.errors';

export const photoTryAsync = <A>(action: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) =>
      new PhotosInfrastructureError({
        action,
        cause,
        message: `Photos service failed to ${action}`,
      }),
  });

export function toPhotoResponseDto(photo: Photo): PhotoResponseDto {
  return {
    id: photo.id,
    product_id: photo.product_id,
    filename: photo.filename,
    mimetype: photo.mimetype,
    size: photo.size,
    storage_path: photo.storage_path,
    uploaded_by: photo.uploaded_by,
    display_order: photo.display_order,
    created_at: photo.created_at,
  };
}
