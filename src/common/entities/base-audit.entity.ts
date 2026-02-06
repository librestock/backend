import { Column, DeleteDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from './base.entity';

/**
 * Base entity class with timestamp and audit fields
 * Use this for entities that need soft delete and audit tracking
 */
export abstract class BaseAuditEntity extends BaseEntity {
  @ApiProperty({
    description: 'Deletion timestamp (for soft-deleted records)',
    format: 'date-time',
    nullable: true,
  })
  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deleted_at: Date | null;

  @ApiProperty({
    description: 'User ID who created the record',
    nullable: true,
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  created_by: string | null;

  @ApiProperty({
    description: 'User ID who last updated the record',
    nullable: true,
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  updated_by: string | null;

  @ApiProperty({
    description: 'User ID who deleted the record',
    nullable: true,
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  deleted_by: string | null;
}
