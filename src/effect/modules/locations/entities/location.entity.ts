import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LocationType } from '@librestock/types/locations';

@Entity('locations')
export class Location {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({ type: 'varchar' })
  name: string;
  @Column({
    type: 'enum',
    enum: LocationType,
  })
  type: LocationType;
  @Column({ type: 'text', default: '' })
  address: string;
  @Column({ type: 'varchar', default: '' })
  contact_person: string;
  @Column({ type: 'varchar', default: '' })
  phone: string;
  @Column({ type: 'boolean', default: true })
  is_active: boolean;
  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
