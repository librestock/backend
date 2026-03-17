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
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({ type: 'uuid' })
  product_id: string;
  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;
  @Column({ type: 'uuid' })
  location_id: string;
  @ManyToOne(() => Location)
  @JoinColumn({ name: 'location_id' })
  location: Location;
  @Column({ type: 'uuid', nullable: true })
  area_id: string | null;
  @ManyToOne(() => Area, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'area_id' })
  area: Area | null;
  @Column({ type: 'int', default: 0 })
  quantity: number;
  @Column({ name: 'batch_number', type: 'varchar', default: '' })
  batchNumber: string;
  @Column({ type: 'timestamptz', nullable: true })
  expiry_date: Date | null;
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  cost_per_unit: number | null;
  @Column({ type: 'timestamptz', nullable: true })
  received_date: Date | null;
  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
