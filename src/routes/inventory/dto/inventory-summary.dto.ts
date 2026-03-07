import { ApiProperty } from '@nestjs/swagger';
import type { InventorySummaryDto as InventorySummaryDtoShape } from '@librestock/types/inventory';

export class InventorySummaryDto implements InventorySummaryDtoShape {
  @ApiProperty({
    description: 'Count of inventory records at or below reorder point',
    example: 12,
  })
  low_stock_count!: number;

  @ApiProperty({
    description: 'Count of inventory records expiring within 30 days',
    example: 7,
  })
  expiring_soon_count!: number;
}
