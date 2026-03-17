import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import type { RoleEntity } from './role.entity';

@Entity('role_permissions')
@Unique(['role_id', 'resource', 'permission'])
export class RolePermissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({ type: 'uuid' })
  role_id: string;
  @Column({ type: 'varchar', length: 50 })
  resource: string;
  @Column({ type: 'varchar', length: 20 })
  permission: string;

  @ManyToOne('RoleEntity', 'permissions', {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'role_id' })
  role: RoleEntity;
}
