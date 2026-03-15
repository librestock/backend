import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm';
import { ClientStatus } from '@librestock/types/clients';
import { BaseEntity } from '../../../platform/entities/base.entity';

@Entity('clients')
@Index(['email'])
@Index(['account_status'])
export class Client extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({ type: 'varchar' })
  company_name: string;
  @Column({ type: 'varchar', nullable: true })
  yacht_name: string | null;
  @Column({ type: 'varchar' })
  contact_person: string;
  @Column({ type: 'varchar' })
  email: string;
  @Column({ type: 'varchar', nullable: true })
  phone: string | null;
  @Column({ type: 'text', nullable: true })
  billing_address: string | null;
  @Column({ type: 'text', nullable: true })
  default_delivery_address: string | null;
  @Column({
    type: 'enum',
    enum: ClientStatus,
    default: ClientStatus.ACTIVE,
  })
  account_status: ClientStatus;
  @Column({ type: 'varchar', nullable: true })
  payment_terms: string | null;
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  credit_limit: number | null;
  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
