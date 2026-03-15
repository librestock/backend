import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { BaseEntity } from '../../../platform/entities/base.entity';

@Entity('suppliers')
export class Supplier extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({ type: 'varchar' })
  name: string;
  @Column({ type: 'varchar', nullable: true })
  contact_person: string | null;
  @Column({ type: 'varchar', nullable: true })
  email: string | null;
  @Column({ type: 'varchar', nullable: true })
  phone: string | null;
  @Column({ type: 'text', nullable: true })
  address: string | null;
  @Column({ type: 'varchar', nullable: true })
  website: string | null;
  @Column({ type: 'text', nullable: true })
  notes: string | null;
  @Column({ type: 'boolean', default: true })
  is_active: boolean;
}
