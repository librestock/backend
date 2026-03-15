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
import { OrderStatus } from '@librestock/types/orders';
import { Client } from '../../clients/entities/client.entity';
import type { OrderItem } from './order-item.entity';

@Entity('orders')
@Index(['order_number'], { unique: true })
@Index(['client_id'])
@Index(['status'])
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({ type: 'varchar' })
  order_number: string;
  @Column({ type: 'uuid' })
  client_id: string;
  @ManyToOne(() => Client)
  @JoinColumn({ name: 'client_id' })
  client: Client;
  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.DRAFT,
  })
  status: OrderStatus;
  @Column({ type: 'timestamptz', nullable: true })
  delivery_deadline: Date | null;
  @Column({ type: 'text' })
  delivery_address: string;
  @Column({ type: 'varchar', nullable: true })
  yacht_name: string | null;
  @Column({ type: 'text', nullable: true })
  special_instructions: string | null;
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total_amount: number;
  @Column({ type: 'uuid', nullable: true })
  assigned_to: string | null;
  @Column({ type: 'uuid' })
  created_by: string;
  @Column({ type: 'timestamptz', nullable: true })
  confirmed_at: Date | null;
  @Column({ type: 'timestamptz', nullable: true })
  shipped_at: Date | null;
  @Column({ type: 'timestamptz', nullable: true })
  delivered_at: Date | null;
  @Column({ type: 'varchar', nullable: true })
  kanban_task_id: string | null;
  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
  @OneToMany('OrderItem', 'order')
  items: OrderItem[];
  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
