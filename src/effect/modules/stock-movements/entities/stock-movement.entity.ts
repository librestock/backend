import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { StockMovementReason } from '@librestock/types/stock-movements';
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
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({ type: 'uuid' })
  product_id: string;
  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;
  @Column({ type: 'uuid', nullable: true })
  from_location_id: string | null;
  @ManyToOne(() => Location, { nullable: true })
  @JoinColumn({ name: 'from_location_id' })
  fromLocation: Location | null;
  @Column({ type: 'uuid', nullable: true })
  to_location_id: string | null;
  @ManyToOne(() => Location, { nullable: true })
  @JoinColumn({ name: 'to_location_id' })
  toLocation: Location | null;
  @Column({ type: 'int' })
  quantity: number;
  @Column({
    type: 'enum',
    enum: StockMovementReason,
  })
  reason: StockMovementReason;
  @Column({ type: 'uuid', nullable: true })
  order_id: string | null;
  @ManyToOne(() => Order, { nullable: true })
  @JoinColumn({ name: 'order_id' })
  order: Order | null;
  @Column({ type: 'varchar', nullable: true })
  reference_number: string | null;
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  cost_per_unit: number | null;
  @Column({ type: 'varchar', nullable: true })
  kanban_task_id: string | null;
  @Column({ type: 'uuid' })
  user_id: string;
  @Column({ type: 'text', nullable: true })
  notes: string | null;
  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
