import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Location } from '../../locations/entities/location.entity';

@Entity('areas')
@Index(['location_id'])
@Index(['parent_id'])
@Index(['location_id', 'parent_id'])
export class Area {
  @ApiProperty({ description: 'Unique identifier', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Location ID', format: 'uuid' })
  @Column({ type: 'uuid' })
  location_id: string;

  @ApiProperty({ description: 'Location relation', type: () => Location })
  @ManyToOne(() => Location, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'location_id' })
  location: Location;

  @ApiProperty({
    description: 'Parent area ID (for nested areas)',
    format: 'uuid',
    nullable: true,
  })
  @Column({ type: 'uuid', nullable: true })
  parent_id: string | null;

  @ManyToOne(() => Area, (area) => area.children, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parent_id' })
  parent: Area | null;

  @OneToMany(() => Area, (area) => area.parent)
  children: Area[];

  @ApiProperty({ description: 'Area name', example: 'Zone A' })
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @ApiProperty({
    description: 'Area code (short identifier)',
    example: 'A1',
  })
  @Column({ type: 'varchar', length: 50, default: '' })
  code: string;

  @ApiProperty({
    description: 'Area description',
  })
  @Column({ type: 'text', default: '' })
  description: string;

  @ApiProperty({ description: 'Whether the area is active', default: true })
  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
