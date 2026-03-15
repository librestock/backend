import { Column, DeleteDateColumn } from 'typeorm';
import { BaseEntity } from './base.entity';

/**
 * Base entity class with timestamp and audit fields
 * Use this for entities that need soft delete and audit tracking
 */
export abstract class BaseAuditEntity extends BaseEntity {
  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deleted_at: Date | null;
  @Column({ type: 'varchar', length: 255, nullable: true })
  created_by: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true })
  updated_by: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true })
  deleted_by: string | null;
}
