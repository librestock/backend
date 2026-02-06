import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('photos')
export class Photo {
  @ApiProperty({ description: 'Unique identifier', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Product ID', format: 'uuid' })
  @Column({ type: 'uuid' })
  product_id: string;

  @ApiProperty({ description: 'Photo URL' })
  @Column({ type: 'text' })
  url: string;

  @ApiProperty({ description: 'Photo caption', nullable: true })
  @Column({ type: 'text', nullable: true })
  caption: string | null;

  @ApiProperty({ description: 'Display order', default: 0 })
  @Column({ type: 'int', default: 0 })
  display_order: number;

  @ApiProperty({
    description: 'User ID who uploaded the photo',
    format: 'uuid',
    nullable: true,
  })
  @Column({ type: 'uuid', nullable: true })
  uploaded_by: string | null;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
