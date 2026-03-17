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
import { Product } from '../../products/entities/product.entity';
import type { Order } from './order.entity';

@Entity('order_items')
@Index(['order_id'])
@Index(['product_id'])
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({ type: 'uuid' })
  order_id: string;
  @ManyToOne('Order', { })
  @JoinColumn({ name: 'order_id' })
  order: Order;
  @Column({ type: 'uuid' })
  product_id: string;
  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;
  @Column({ type: 'int' })
  quantity: number;
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  unit_price: number;
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;
  @Column({ type: 'text', nullable: true })
  notes: string | null;
  @Column({ type: 'int', default: 0 })
  quantity_picked: number;
  @Column({ type: 'int', default: 0 })
  quantity_packed: number;
  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
