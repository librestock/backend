import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { AuditAction, AuditEntityType } from 'src/common/enums';

export interface AuditChanges {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

@Entity('audit_logs')
@Index(['entity_type', 'entity_id'])
@Index(['user_id'])
@Index(['created_at'])
export class AuditLog {
  @ApiProperty({ description: 'Unique identifier', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'User ID who performed the action',
    format: 'uuid',
    nullable: true,
  })
  @Column({ type: 'uuid', nullable: true })
  user_id: string | null;

  @ApiProperty({ description: 'Action performed', enum: AuditAction })
  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  action: AuditAction;

  @ApiProperty({
    description: 'Type of entity affected',
    enum: AuditEntityType,
  })
  @Column({
    type: 'enum',
    enum: AuditEntityType,
  })
  entity_type: AuditEntityType;

  @ApiProperty({ description: 'ID of the affected entity', format: 'uuid' })
  @Column({ type: 'uuid' })
  entity_id: string;

  @ApiProperty({ description: 'Changes made (before/after)', nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  changes: AuditChanges | null;

  @ApiProperty({ description: 'IP address of the requester', nullable: true })
  @Column({ type: 'varchar', nullable: true })
  ip_address: string | null;

  @ApiProperty({ description: 'User agent of the requester', nullable: true })
  @Column({ type: 'varchar', nullable: true })
  user_agent: string | null;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
