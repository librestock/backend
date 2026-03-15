import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { AuditAction, AuditEntityType } from '@librestock/types/audit-logs';

export interface AuditChanges {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

@Entity('audit_logs')
@Index(['entity_type', 'entity_id'])
@Index(['user_id'])
@Index(['created_at'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({ type: 'uuid', nullable: true })
  user_id: string | null;
  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  action: AuditAction;
  @Column({
    type: 'enum',
    enum: AuditEntityType,
  })
  entity_type: AuditEntityType;
  @Column({ type: 'uuid' })
  entity_id: string;
  @Column({ type: 'jsonb', nullable: true })
  changes: AuditChanges | null;
  @Column({ type: 'varchar', nullable: true })
  ip_address: string | null;
  @Column({ type: 'varchar', nullable: true })
  user_agent: string | null;
  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
