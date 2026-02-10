import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { RoleEntity } from './role.entity';

@Entity('role_permissions')
@Unique(['role_id', 'resource', 'permission'])
export class RolePermissionEntity {
  @ApiProperty({ description: 'Unique identifier', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Role ID', format: 'uuid' })
  @Column({ type: 'uuid' })
  role_id: string;

  @ApiProperty({ description: 'Resource name', example: 'dashboard' })
  @Column({ type: 'varchar', length: 50 })
  resource: string;

  @ApiProperty({ description: 'Permission type', example: 'read' })
  @Column({ type: 'varchar', length: 20 })
  permission: string;

  @ManyToOne(() => RoleEntity, (role) => role.permissions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'role_id' })
  role: RoleEntity;
}
