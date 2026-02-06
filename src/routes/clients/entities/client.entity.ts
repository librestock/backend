import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { ClientStatus } from '@librestock/types';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('clients')
@Index(['email'])
@Index(['account_status'])
export class Client extends BaseEntity {
  @ApiProperty({ description: 'Unique identifier', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Company name' })
  @Column({ type: 'varchar' })
  company_name: string;

  @ApiProperty({ description: 'Yacht name', nullable: true })
  @Column({ type: 'varchar', nullable: true })
  yacht_name: string | null;

  @ApiProperty({ description: 'Contact person name' })
  @Column({ type: 'varchar' })
  contact_person: string;

  @ApiProperty({ description: 'Email address' })
  @Column({ type: 'varchar' })
  email: string;

  @ApiProperty({ description: 'Phone number', nullable: true })
  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @ApiProperty({ description: 'Billing address', nullable: true })
  @Column({ type: 'text', nullable: true })
  billing_address: string | null;

  @ApiProperty({ description: 'Default delivery address', nullable: true })
  @Column({ type: 'text', nullable: true })
  default_delivery_address: string | null;

  @ApiProperty({
    description: 'Account status',
    enum: ClientStatus,
    default: ClientStatus.ACTIVE,
  })
  @Column({
    type: 'enum',
    enum: ClientStatus,
    default: ClientStatus.ACTIVE,
  })
  account_status: ClientStatus;

  @ApiProperty({ description: 'Payment terms', nullable: true })
  @Column({ type: 'varchar', nullable: true })
  payment_terms: string | null;

  @ApiProperty({ description: 'Credit limit', type: 'number', nullable: true })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  credit_limit: number | null;

  @ApiProperty({ description: 'Additional notes', nullable: true })
  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
