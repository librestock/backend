import { ApiProperty } from '@nestjs/swagger';
import type { PhotoResponseDto as PhotoResponseDtoShape } from '@librestock/types';

export class PhotoResponseDto implements PhotoResponseDtoShape {
  @ApiProperty({
    description: 'Unique identifier',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Product ID',
    format: 'uuid',
  })
  product_id: string;

  @ApiProperty({
    description: 'Original filename',
    example: 'product-photo.jpg',
  })
  filename: string;

  @ApiProperty({
    description: 'MIME type',
    example: 'image/jpeg',
  })
  mimetype: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 204800,
  })
  size: number;

  @ApiProperty({
    description: 'Storage path on disk',
  })
  storage_path: string;

  @ApiProperty({
    description: 'User ID who uploaded the photo',
    format: 'uuid',
    nullable: true,
  })
  uploaded_by: string | null;

  @ApiProperty({
    description: 'Display order',
    example: 0,
  })
  display_order: number;

  @ApiProperty({
    description: 'Creation timestamp',
    format: 'date-time',
  })
  created_at: Date;
}
