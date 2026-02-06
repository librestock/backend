import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('suppliers')
export class Supplier extends BaseEntity {
  @ApiProperty({ description: 'Unique identifier', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Supplier name' })
  @Column({ type: 'varchar' })
  name: string;

  @ApiProperty({ description: 'Contact person name', nullable: true })
  @Column({ type: 'varchar', nullable: true })
  contact_person: string | null;

  @ApiProperty({ description: 'Email address', nullable: true })
  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @ApiProperty({ description: 'Phone number', nullable: true })
  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @ApiProperty({ description: 'Physical address', nullable: true })
  @Column({ type: 'text', nullable: true })
  address: string | null;

  @ApiProperty({ description: 'Website URL', nullable: true })
  @Column({ type: 'varchar', nullable: true })
  website: string | null;

  @ApiProperty({ description: 'Additional notes', nullable: true })
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ApiProperty({ description: 'Whether the supplier is active', default: true })
  @Column({ type: 'boolean', default: true })
  is_active: boolean;
}
