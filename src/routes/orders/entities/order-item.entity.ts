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
import { Product } from '../../products/entities/product.entity';
import { Order } from './order.entity';

@Entity('order_items')
@Index(['order_id'])
@Index(['product_id'])
export class OrderItem {
  @ApiProperty({ description: 'Unique identifier', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Order ID', format: 'uuid' })
  @Column({ type: 'uuid' })
  order_id: string;

  @ApiProperty({ description: 'Order relation', type: () => Order })
  @ManyToOne(() => Order)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ApiProperty({ description: 'Product ID', format: 'uuid' })
  @Column({ type: 'uuid' })
  product_id: string;

  @ApiProperty({ description: 'Product relation', type: () => Product })
  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ApiProperty({ description: 'Quantity ordered' })
  @Column({ type: 'int' })
  quantity: number;

  @ApiProperty({ description: 'Unit price', type: 'number' })
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  unit_price: number;

  @ApiProperty({ description: 'Subtotal amount', type: 'number' })
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;

  @ApiProperty({ description: 'Additional notes', nullable: true })
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ApiProperty({ description: 'Quantity picked', default: 0 })
  @Column({ type: 'int', default: 0 })
  quantity_picked: number;

  @ApiProperty({ description: 'Quantity packed', default: 0 })
  @Column({ type: 'int', default: 0 })
  quantity_packed: number;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
