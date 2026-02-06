import { CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Base entity class with timestamp fields
 * All entities should extend this class
 */
export abstract class BaseEntity {
  @ApiProperty({ description: 'Creation timestamp', format: 'date-time' })
  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ApiProperty({ description: 'Last update timestamp', format: 'date-time' })
  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
