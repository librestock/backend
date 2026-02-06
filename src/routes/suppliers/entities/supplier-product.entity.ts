import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Supplier } from './supplier.entity';

@Entity('supplier_products')
export class SupplierProduct {
  @ApiProperty({ description: 'Unique identifier', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Supplier ID', format: 'uuid' })
  @Column({ type: 'uuid' })
  supplier_id: string;

  @ApiProperty({ description: 'Supplier relation', type: () => Supplier })
  @ManyToOne(() => Supplier)
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @ApiProperty({ description: 'Product ID', format: 'uuid' })
  @Column({ type: 'uuid' })
  product_id: string;

  @ApiProperty({ description: 'Supplier SKU', nullable: true })
  @Column({ type: 'varchar', nullable: true })
  supplier_sku: string | null;

  @ApiProperty({ description: 'Cost per unit', type: 'number', nullable: true })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  cost_per_unit: number | null;

  @ApiProperty({ description: 'Lead time in days', nullable: true })
  @Column({ type: 'int', nullable: true })
  lead_time_days: number | null;

  @ApiProperty({ description: 'Minimum order quantity', nullable: true })
  @Column({ type: 'int', nullable: true })
  minimum_order_quantity: number | null;

  @ApiProperty({
    description: 'Whether this is the preferred supplier',
    default: false,
  })
  @Column({ type: 'boolean', default: false })
  is_preferred: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
