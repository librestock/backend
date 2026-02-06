import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('branding_settings')
export class BrandingSettings {
  @ApiProperty({ description: 'Fixed ID (always 1)', example: 1 })
  @PrimaryColumn({ type: 'int', default: 1 })
  id: number;

  @ApiProperty({ description: 'Application name', example: 'My Inventory' })
  @Column({ type: 'varchar', length: 100, default: 'LibreStock' })
  app_name: string;

  @ApiProperty({ description: 'Application tagline', example: 'Inventory management for your business' })
  @Column({ type: 'varchar', length: 255, default: 'Inventory management system' })
  tagline: string;

  @ApiProperty({ description: 'Logo URL (relative or absolute)', nullable: true })
  @Column({ type: 'varchar', length: 500, nullable: true })
  logo_url: string | null;

  @ApiProperty({ description: 'Favicon URL (relative or absolute)', nullable: true })
  @Column({ type: 'varchar', length: 500, nullable: true })
  favicon_url: string | null;

  @ApiProperty({ description: 'Primary brand color (hex)', example: '#3b82f6' })
  @Column({ type: 'varchar', length: 7, default: '#3b82f6' })
  primary_color: string;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @ApiProperty({ description: 'User ID who last updated' })
  @Column({ type: 'varchar', nullable: true })
  updated_by: string | null;
}
