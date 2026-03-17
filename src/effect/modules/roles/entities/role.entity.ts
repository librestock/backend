import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../platform/entities/base.entity';
import type { RolePermissionEntity } from './role-permission.entity';

@Entity('roles')
export class RoleEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;
  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;
  @Column({ type: 'boolean', default: false })
  is_system: boolean;

  @OneToMany('RolePermissionEntity', 'role', {
    cascade: true,
    eager: true,
  })
  permissions: RolePermissionEntity[];
}
