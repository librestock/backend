import { ApiProperty } from '@nestjs/swagger';
import type { AreaResponseDto as AreaResponseDtoShape } from '@librestock/types';
import { BaseResponseDto } from '../../../common/dto/base-response.dto';

export class AreaResponseDto
  extends BaseResponseDto
  implements AreaResponseDtoShape
{
  @ApiProperty({ description: 'Unique identifier', format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Location ID', format: 'uuid' })
  location_id: string;

  @ApiProperty({
    description: 'Parent area ID',
    format: 'uuid',
    nullable: true,
  })
  parent_id: string | null;

  @ApiProperty({ description: 'Area name' })
  name: string;

  @ApiProperty({ description: 'Area code' })
  code: string;

  @ApiProperty({ description: 'Area description' })
  description: string;

  @ApiProperty({ description: 'Whether the area is active' })
  is_active: boolean;

  @ApiProperty({
    description: 'Child areas',
    type: () => [AreaResponseDto],
    required: false,
  })
  children?: AreaResponseDto[];
}
