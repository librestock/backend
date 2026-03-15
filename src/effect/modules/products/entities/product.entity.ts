import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Category } from '../../categories/entities/category.entity';
import type { Photo } from '../../photos/entities/photo.entity';
import { Supplier } from '../../suppliers/entities/supplier.entity';
import { BaseAuditEntity } from '../../../platform/entities/base-audit.entity';

@Entity('products')
@Index(['deleted_at'])
@Index(['is_active', 'deleted_at'])
@Index(['category_id', 'deleted_at'])
export class Product extends BaseAuditEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({ type: 'varchar', length: 50, unique: true })
  sku: string;
  @Column({ type: 'varchar', length: 200 })
  name: string;
  @Column({ type: 'text', nullable: true })
  description: string | null;
  @Column({ type: 'uuid' })
  category_id: string;
  @Column({ type: 'int', nullable: true })
  volume_ml: number | null;
  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  weight_kg: number | null;
  @Column({ type: 'varchar', length: 50, nullable: true })
  dimensions_cm: string | null;
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  standard_cost: number | null;
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  standard_price: number | null;
  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  markup_percentage: number | null;
  @Column({ type: 'int', default: 0 })
  reorder_point: number;
  @Column({ type: 'uuid', nullable: true })
  primary_supplier_id: string | null;

  @ManyToOne(() => Supplier, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'primary_supplier_id' })
  primary_supplier: Supplier | null;
  @Column({ type: 'varchar', length: 50, nullable: true })
  supplier_sku: string | null;
  @Column({ type: 'varchar', length: 100, nullable: true })
  barcode: string | null;
  @Column({ type: 'varchar', length: 50, nullable: true })
  unit: string | null;
  @Column({ type: 'boolean', default: true })
  is_active: boolean;
  @Column({ type: 'boolean', default: false })
  is_perishable: boolean;
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ManyToOne(() => Category, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @OneToMany('Photo', 'product')
  photos: Photo[];
}
