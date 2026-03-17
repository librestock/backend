import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';
import { BRANDING_SETTINGS_ID } from '../branding.constants';

@Entity('branding_settings')
export class BrandingSettings {
  @PrimaryColumn({ type: 'int', default: BRANDING_SETTINGS_ID })
  id: number;
  @Column({ type: 'varchar', length: 100, default: 'LibreStock' })
  app_name: string;
  @Column({
    type: 'varchar',
    length: 255,
    default: 'Inventory management system',
  })
  tagline: string;
  @Column({ type: 'varchar', length: 500, nullable: true })
  logo_url: string | null;
  @Column({ type: 'varchar', length: 500, nullable: true })
  favicon_url: string | null;
  @Column({ type: 'varchar', length: 7, default: '#3b82f6' })
  primary_color: string;
  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
  @Column({ type: 'varchar', nullable: true })
  updated_by: string | null;
}
