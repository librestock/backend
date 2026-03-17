import { CreateDateColumn, UpdateDateColumn } from 'typeorm';
/**
 * Base entity class with timestamp fields
 * All entities should extend this class
 */
export abstract class BaseEntity {
  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
