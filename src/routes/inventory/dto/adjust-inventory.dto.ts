import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';
import type { AdjustInventoryDto as AdjustInventoryDtoShape } from '@librestock/types';

export class AdjustInventoryDto implements AdjustInventoryDtoShape {
  @ApiProperty({
    description: 'Quantity adjustment (positive to add, negative to subtract)',
    example: 5,
  })
  @IsInt()
  adjustment: number;
}
