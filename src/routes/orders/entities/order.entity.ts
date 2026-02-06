import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '@librestock/types';
import { Client } from '../../clients/entities/client.entity';
import { OrderItem } from './order-item.entity';

@Entity('orders')
@Index(['order_number'], { unique: true })
@Index(['client_id'])
@Index(['status'])
export class Order {
  @ApiProperty({ description: 'Unique identifier', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Order number' })
  @Column({ type: 'varchar' })
  order_number: string;

  @ApiProperty({ description: 'Client ID', format: 'uuid' })
  @Column({ type: 'uuid' })
  client_id: string;

  @ApiProperty({ description: 'Client relation', type: () => Client })
  @ManyToOne(() => Client)
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @ApiProperty({
    description: 'Order status',
    enum: OrderStatus,
    default: OrderStatus.DRAFT,
  })
  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.DRAFT,
  })
  status: OrderStatus;

  @ApiProperty({ description: 'Delivery deadline', nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  delivery_deadline: Date | null;

  @ApiProperty({ description: 'Delivery address' })
  @Column({ type: 'text' })
  delivery_address: string;

  @ApiProperty({ description: 'Yacht name', nullable: true })
  @Column({ type: 'varchar', nullable: true })
  yacht_name: string | null;

  @ApiProperty({ description: 'Special instructions', nullable: true })
  @Column({ type: 'text', nullable: true })
  special_instructions: string | null;

  @ApiProperty({
    description: 'Total order amount',
    type: 'number',
    default: 0,
  })
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total_amount: number;

  @ApiProperty({
    description: 'User ID assigned to this order',
    format: 'uuid',
    nullable: true,
  })
  @Column({ type: 'uuid', nullable: true })
  assigned_to: string | null;

  @ApiProperty({ description: 'User ID who created the order', format: 'uuid' })
  @Column({ type: 'uuid' })
  created_by: string;

  @ApiProperty({
    description: 'Timestamp when order was confirmed',
    nullable: true,
  })
  @Column({ type: 'timestamptz', nullable: true })
  confirmed_at: Date | null;

  @ApiProperty({
    description: 'Timestamp when order was shipped',
    nullable: true,
  })
  @Column({ type: 'timestamptz', nullable: true })
  shipped_at: Date | null;

  @ApiProperty({
    description: 'Timestamp when order was delivered',
    nullable: true,
  })
  @Column({ type: 'timestamptz', nullable: true })
  delivered_at: Date | null;

  @ApiProperty({ description: 'Kanban task ID', nullable: true })
  @Column({ type: 'varchar', nullable: true })
  kanban_task_id: string | null;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ApiProperty({ description: 'Order items', type: () => [OrderItem] })
  @OneToMany(() => OrderItem, (item) => item.order)
  items: OrderItem[];

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
