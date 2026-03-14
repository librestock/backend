import { ApiProperty } from '@nestjs/swagger';
import type { SupplierResponseDto as SupplierResponseDtoShape } from '@librestock/types/suppliers';
import { BaseResponseDto } from '../../../common/dto/base-response.dto';

export class SupplierResponseDto
  extends BaseResponseDto
  implements SupplierResponseDtoShape
{
  @ApiProperty({
    description: 'Unique identifier',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Supplier name',
    example: 'Acme Supplies',
  })
  name: string;

  @ApiProperty({
    description: 'Contact person name',
    nullable: true,
    example: 'John Smith',
  })
  contact_person: string | null;

  @ApiProperty({
    description: 'Email address',
    nullable: true,
    example: 'john@acme.com',
  })
  email: string | null;

  @ApiProperty({
    description: 'Phone number',
    nullable: true,
    example: '+1-555-123-4567',
  })
  phone: string | null;

  @ApiProperty({
    description: 'Physical address',
    nullable: true,
    example: '123 Supply St, Commerce City, CO 80022',
  })
  address: string | null;

  @ApiProperty({
    description: 'Website URL',
    nullable: true,
    example: 'https://acme.com',
  })
  website: string | null;

  @ApiProperty({
    description: 'Additional notes',
    nullable: true,
  })
  notes: string | null;

  @ApiProperty({
    description: 'Whether the supplier is active',
    example: true,
  })
  is_active: boolean;
}
