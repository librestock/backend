import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Unique,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { RoleEntity } from '../../roles/entities/role.entity';

@Entity('user_roles')
@Unique(['user_id', 'role_id'])
export class UserRoleEntity {
  @ApiProperty({ description: 'Unique identifier', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'User ID', format: 'uuid' })
  @Index()
  @Column({ type: 'uuid' })
  user_id: string;

  @ApiProperty({ description: 'Role ID', format: 'uuid' })
  @Column({ type: 'uuid' })
  role_id: string;

  @ManyToOne(() => RoleEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role: RoleEntity;
}
