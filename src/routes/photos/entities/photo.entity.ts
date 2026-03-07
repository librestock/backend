import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Product } from '../../products/entities/product.entity';

@Entity('photos')
@Index(['product_id'])
export class Photo {
  @ApiProperty({ description: 'Unique identifier', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ description: 'Product ID', format: 'uuid' })
  @Column({ type: 'uuid' })
  product_id!: string;

  @ApiProperty({ description: 'Original filename' })
  @Column({ type: 'varchar', length: 255 })
  filename!: string;

  @ApiProperty({ description: 'MIME type of the file' })
  @Column({ type: 'varchar', length: 100 })
  mimetype!: string;

  @ApiProperty({ description: 'File size in bytes' })
  @Column({ type: 'int' })
  size!: number;

  @ApiProperty({ description: 'Path to file on disk' })
  @Column({ type: 'varchar', length: 500 })
  storage_path!: string;

  @ApiProperty({ description: 'Display order', default: 0 })
  @Column({ type: 'int', default: 0 })
  display_order!: number;

  @ApiProperty({
    description: 'User ID who uploaded the photo',
    format: 'uuid',
    nullable: true,
  })
  @Column({ type: 'uuid', nullable: true })
  uploaded_by!: string | null;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @ManyToOne(() => Product, (product) => product.photos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product!: Product;
}
