import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { Product } from '../../products/entities/product.entity';

@Entity('photos')
@Index(['product_id'])
export class Photo {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({ type: 'uuid' })
  product_id: string;
  @Column({ type: 'varchar', length: 255 })
  filename: string;
  @Column({ type: 'varchar', length: 100 })
  mimetype: string;
  @Column({ type: 'int' })
  size: number;
  @Column({ type: 'varchar', length: 500 })
  storage_path: string;
  @Column({ type: 'int', default: 0 })
  display_order: number;
  @Column({ type: 'uuid', nullable: true })
  uploaded_by: string | null;
  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ManyToOne('Product', 'photos', {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;
}
