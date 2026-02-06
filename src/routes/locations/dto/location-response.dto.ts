import { ApiProperty } from '@nestjs/swagger';
import {
  type LocationResponseDto as LocationResponseDtoShape,
  LocationType,
} from '@librestock/types';
import { BaseResponseDto } from '../../../common/dto/base-response.dto';

export class LocationResponseDto
  extends BaseResponseDto
  implements LocationResponseDtoShape
{
  @ApiProperty({
    description: 'Unique identifier',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Location name',
    example: 'Main Warehouse',
  })
  name: string;

  @ApiProperty({
    description: 'Location type',
    enum: LocationType,
    example: LocationType.WAREHOUSE,
  })
  type: LocationType;

  @ApiProperty({
    description: 'Physical address',
    example: '123 Harbor Drive, Miami, FL 33101',
  })
  address: string;

  @ApiProperty({
    description: 'Contact person name',
    example: 'John Smith',
  })
  contact_person: string;

  @ApiProperty({
    description: 'Phone number',
    example: '+1-555-123-4567',
  })
  phone: string;

  @ApiProperty({
    description: 'Whether the location is active',
    example: true,
  })
  is_active: boolean;
}
