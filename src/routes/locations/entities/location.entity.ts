import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { LocationType } from 'src/common/enums/location-type.enum';

@Entity('locations')
export class Location {
  @ApiProperty({ description: 'Unique identifier', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Location name' })
  @Column({ type: 'varchar' })
  name: string;

  @ApiProperty({ description: 'Location type', enum: LocationType })
  @Column({
    type: 'enum',
    enum: LocationType,
  })
  type: LocationType;

  @ApiProperty({ description: 'Physical address' })
  @Column({ type: 'text', default: '' })
  address: string;

  @ApiProperty({ description: 'Contact person name' })
  @Column({ type: 'varchar', default: '' })
  contact_person: string;

  @ApiProperty({ description: 'Phone number' })
  @Column({ type: 'varchar', default: '' })
  phone: string;

  @ApiProperty({ description: 'Whether the location is active', default: true })
  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
