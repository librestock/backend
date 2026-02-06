import { ApiProperty } from '@nestjs/swagger';
import {
  type ClientResponseDto as ClientResponseDtoShape,
  ClientStatus,
} from '@librestock/types';
import { BaseResponseDto } from '../../../common/dto/base-response.dto';

export class ClientResponseDto
  extends BaseResponseDto
  implements ClientResponseDtoShape
{
  @ApiProperty({
    description: 'Unique identifier',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({ description: 'Company name', example: 'Acme Corp' })
  company_name: string;

  @ApiProperty({ description: 'Contact person', example: 'John Doe' })
  contact_person: string;

  @ApiProperty({
    description: 'Email address',
    example: 'john@acmecorp.com',
  })
  email: string;

  @ApiProperty({
    description: 'Yacht name',
    nullable: true,
    example: 'Sea Breeze',
  })
  yacht_name: string | null;

  @ApiProperty({
    description: 'Phone number',
    nullable: true,
    example: '+1-555-123-4567',
  })
  phone: string | null;

  @ApiProperty({
    description: 'Billing address',
    nullable: true,
    example: '123 Harbor Drive, Miami, FL 33101',
  })
  billing_address: string | null;

  @ApiProperty({
    description: 'Default delivery address',
    nullable: true,
    example: '456 Marina Way, Miami, FL 33101',
  })
  default_delivery_address: string | null;

  @ApiProperty({
    description: 'Account status',
    enum: ClientStatus,
    example: ClientStatus.ACTIVE,
  })
  account_status: ClientStatus;

  @ApiProperty({
    description: 'Payment terms',
    nullable: true,
    example: 'Net 30',
  })
  payment_terms: string | null;

  @ApiProperty({
    description: 'Credit limit',
    type: 'number',
    nullable: true,
    example: 50000,
  })
  credit_limit: number | null;

  @ApiProperty({
    description: 'Additional notes',
    nullable: true,
    example: 'VIP client',
  })
  notes: string | null;
}
