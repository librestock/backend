import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Supplier } from './supplier.entity';

@Entity('supplier_products')
export class SupplierProduct {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({ type: 'uuid' })
  supplier_id: string;
  @ManyToOne(() => Supplier)
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;
  @Column({ type: 'uuid' })
  product_id: string;
  @Column({ type: 'varchar', nullable: true })
  supplier_sku: string | null;
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  cost_per_unit: number | null;
  @Column({ type: 'int', nullable: true })
  lead_time_days: number | null;
  @Column({ type: 'int', nullable: true })
  minimum_order_quantity: number | null;
  @Column({ type: 'boolean', default: false })
  is_preferred: boolean;
  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
