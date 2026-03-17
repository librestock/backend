import type { PhotoResponseDto } from '@librestock/types/photos';
import type { Photo } from './entities/photo.entity';

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
