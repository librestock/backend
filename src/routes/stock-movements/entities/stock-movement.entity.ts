import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { StockMovementReason } from '@librestock/types';
import { Product } from '../../products/entities/product.entity';
import { Location } from '../../locations/entities/location.entity';
import { Order } from '../../orders/entities/order.entity';

@Entity('stock_movements')
@Index(['product_id'])
@Index(['from_location_id'])
@Index(['to_location_id'])
@Index(['reason'])
@Index(['created_at'])
export class StockMovement {
  @ApiProperty({ description: 'Unique identifier', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Product ID', format: 'uuid' })
  @Column({ type: 'uuid' })
  product_id: string;

  @ApiProperty({
    description: 'Product relation',
    type: () => Product,
  })
  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ApiProperty({
    description: 'Source location ID',
    format: 'uuid',
    nullable: true,
  })
  @Column({ type: 'uuid', nullable: true })
  from_location_id: string | null;

  @ApiProperty({
    description: 'Source location relation',
    type: () => Location,
    nullable: true,
  })
  @ManyToOne(() => Location, { nullable: true })
  @JoinColumn({ name: 'from_location_id' })
  fromLocation: Location | null;

  @ApiProperty({
    description: 'Destination location ID',
    format: 'uuid',
    nullable: true,
  })
  @Column({ type: 'uuid', nullable: true })
  to_location_id: string | null;

  @ApiProperty({
    description: 'Destination location relation',
    type: () => Location,
    nullable: true,
  })
  @ManyToOne(() => Location, { nullable: true })
  @JoinColumn({ name: 'to_location_id' })
  toLocation: Location | null;

  @ApiProperty({ description: 'Quantity moved' })
  @Column({ type: 'int' })
  quantity: number;

  @ApiProperty({
    description: 'Reason for the stock movement',
    enum: StockMovementReason,
  })
  @Column({
    type: 'enum',
    enum: StockMovementReason,
  })
  reason: StockMovementReason;

  @ApiProperty({
    description: 'Related order ID',
    format: 'uuid',
    nullable: true,
  })
  @Column({ type: 'uuid', nullable: true })
  order_id: string | null;

  @ApiProperty({
    description: 'Related order relation',
    type: () => Order,
    nullable: true,
  })
  @ManyToOne(() => Order, { nullable: true })
  @JoinColumn({ name: 'order_id' })
  order: Order | null;

  @ApiProperty({ description: 'Reference number', nullable: true })
  @Column({ type: 'varchar', nullable: true })
  reference_number: string | null;

  @ApiProperty({ description: 'Cost per unit', type: 'number', nullable: true })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  cost_per_unit: number | null;

  @ApiProperty({ description: 'Kanban task ID', nullable: true })
  @Column({ type: 'varchar', nullable: true })
  kanban_task_id: string | null;

  @ApiProperty({
    description: 'User ID who performed the movement',
    format: 'uuid',
  })
  @Column({ type: 'uuid' })
  user_id: string;

  @ApiProperty({ description: 'Additional notes', nullable: true })
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
