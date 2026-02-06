import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Location } from '../../locations/entities/location.entity';
import { Product } from '../../products/entities/product.entity';
import { Area } from '../../areas/entities/area.entity';

@Entity('inventory')
@Index(['product_id'])
@Index(['location_id'])
@Index(['area_id'])
@Index(['product_id', 'location_id'])
@Index(['product_id', 'location_id', 'area_id'])
export class Inventory {
  @ApiProperty({ description: 'Unique identifier', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Product ID', format: 'uuid' })
  @Column({ type: 'uuid' })
  product_id: string;

  @ApiProperty({ description: 'Product relation', type: () => Product })
  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ApiProperty({ description: 'Location ID', format: 'uuid' })
  @Column({ type: 'uuid' })
  location_id: string;

  @ApiProperty({ description: 'Location relation', type: () => Location })
  @ManyToOne(() => Location)
  @JoinColumn({ name: 'location_id' })
  location: Location;

  @ApiProperty({
    description: 'Area ID (optional, for specific placement within location)',
    format: 'uuid',
    nullable: true,
  })
  @Column({ type: 'uuid', nullable: true })
  area_id: string | null;

  @ApiProperty({
    description: 'Area relation (specific placement within location)',
    type: () => Area,
    nullable: true,
  })
  @ManyToOne(() => Area, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'area_id' })
  area: Area | null;

  @ApiProperty({ description: 'Quantity in stock', default: 0 })
  @Column({ type: 'int', default: 0 })
  quantity: number;

  @ApiProperty({ description: 'Batch number' })
  @Column({ name: 'batch_number', type: 'varchar', default: '' })
  batchNumber: string;

  @ApiProperty({ description: 'Expiry date', nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  expiry_date: Date | null;

  @ApiProperty({ description: 'Cost per unit', type: 'number', nullable: true })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  cost_per_unit: number | null;

  @ApiProperty({ description: 'Date when received', nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  received_date: Date | null;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
