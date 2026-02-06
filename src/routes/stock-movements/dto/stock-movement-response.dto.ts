import { ApiProperty } from '@nestjs/swagger';
import {
  type StockMovementResponseDto as StockMovementResponseDtoShape,
  type StockMovementLocationSummary,
  type StockMovementProductSummary,
  StockMovementReason,
} from '@librestock/types';

export class StockMovementResponseDto implements StockMovementResponseDtoShape {
  @ApiProperty({ description: 'Unique identifier', format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Product ID', format: 'uuid' })
  product_id: string;

  @ApiProperty({ description: 'Product summary', nullable: true })
  product: StockMovementProductSummary | null;

  @ApiProperty({ description: 'Source location ID', nullable: true })
  from_location_id: string | null;

  @ApiProperty({ description: 'Source location summary', nullable: true })
  from_location: StockMovementLocationSummary | null;

  @ApiProperty({ description: 'Destination location ID', nullable: true })
  to_location_id: string | null;

  @ApiProperty({ description: 'Destination location summary', nullable: true })
  to_location: StockMovementLocationSummary | null;

  @ApiProperty({ description: 'Quantity moved' })
  quantity: number;

  @ApiProperty({
    description: 'Reason for the stock movement',
    enum: StockMovementReason,
  })
  reason: StockMovementReason;

  @ApiProperty({ description: 'Related order ID', nullable: true })
  order_id: string | null;

  @ApiProperty({ description: 'Reference number', nullable: true })
  reference_number: string | null;

  @ApiProperty({ description: 'Cost per unit', nullable: true })
  cost_per_unit: number | null;

  @ApiProperty({ description: 'User who performed the movement', format: 'uuid' })
  user_id: string;

  @ApiProperty({ description: 'Additional notes', nullable: true })
  notes: string | null;

  @ApiProperty({ description: 'Creation timestamp', format: 'date-time' })
  created_at: Date;
}
