import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Category } from '../../categories/entities/category.entity';
import { Supplier } from '../../suppliers/entities/supplier.entity';
import { BaseAuditEntity } from '../../../common/entities/base-audit.entity';

@Entity('products')
@Index(['deleted_at'])
@Index(['is_active', 'deleted_at'])
@Index(['category_id', 'deleted_at'])
export class Product extends BaseAuditEntity {
  @ApiProperty({
    description: 'Unique identifier',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Product SKU',
    example: 'PROD-001',
  })
  @Column({ type: 'varchar', length: 50, unique: true })
  sku: string;

  @ApiProperty({
    description: 'Product name',
    example: 'Marine Pump',
  })
  @Column({ type: 'varchar', length: 200 })
  name: string;

  @ApiProperty({
    description: 'Product description',
    nullable: true,
  })
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ApiProperty({
    description: 'Category ID',
    format: 'uuid',
  })
  @Column({ type: 'uuid' })
  category_id: string;

  @ApiProperty({
    description: 'Brand ID',
    format: 'uuid',
    nullable: true,
  })
  @Column({ type: 'uuid', nullable: true })
  brand_id: string | null;

  @ApiProperty({
    description: 'Volume in milliliters',
    nullable: true,
  })
  @Column({ type: 'int', nullable: true })
  volume_ml: number | null;

  @ApiProperty({
    description: 'Weight in kilograms',
    nullable: true,
  })
  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  weight_kg: number | null;

  @ApiProperty({
    description: 'Dimensions in cm (e.g., 10x10x5)',
    nullable: true,
    example: '10x10x5',
  })
  @Column({ type: 'varchar', length: 50, nullable: true })
  dimensions_cm: string | null;

  @ApiProperty({
    description: 'Standard cost',
    nullable: true,
  })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  standard_cost: number | null;

  @ApiProperty({
    description: 'Standard price',
    nullable: true,
  })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  standard_price: number | null;

  @ApiProperty({
    description: 'Markup percentage',
    nullable: true,
  })
  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  markup_percentage: number | null;

  @ApiProperty({
    description: 'Reorder point threshold',
    example: 10,
  })
  @Column({ type: 'int', default: 0 })
  reorder_point: number;

  @ApiProperty({
    description: 'Primary supplier ID',
    format: 'uuid',
    nullable: true,
  })
  @Column({ type: 'uuid', nullable: true })
  primary_supplier_id: string | null;

  @ManyToOne(() => Supplier, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'primary_supplier_id' })
  primary_supplier: Supplier | null;

  @ApiProperty({
    description: 'Supplier SKU',
    nullable: true,
  })
  @Column({ type: 'varchar', length: 50, nullable: true })
  supplier_sku: string | null;

  @ApiProperty({
    description: 'Product barcode',
    nullable: true,
    example: '0641628607549',
  })
  @Column({ type: 'varchar', length: 100, nullable: true })
  barcode: string | null;

  @ApiProperty({
    description: 'Unit of measure',
    nullable: true,
    example: 'units',
  })
  @Column({ type: 'varchar', length: 50, nullable: true })
  unit: string | null;

  @ApiProperty({
    description: 'Whether the product is active',
  })
  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @ApiProperty({
    description: 'Whether the product is perishable',
  })
  @Column({ type: 'boolean', default: false })
  is_perishable: boolean;

  @ApiProperty({
    description: 'Additional notes',
    nullable: true,
  })
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ManyToOne(() => Category, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'category_id' })
  category: Category;
}
