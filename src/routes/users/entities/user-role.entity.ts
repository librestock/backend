import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Unique,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from 'src/common/enums';

@Entity('user_roles')
@Unique(['user_id', 'role'])
export class UserRoleEntity {
  @ApiProperty({ description: 'Unique identifier', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'User ID', format: 'uuid' })
  @Index()
  @Column({ type: 'varchar' })
  user_id: string;

  @ApiProperty({ description: 'Assigned role', enum: UserRole })
  @Column({
    type: 'enum',
    enum: UserRole,
  })
  role: UserRole;
}
