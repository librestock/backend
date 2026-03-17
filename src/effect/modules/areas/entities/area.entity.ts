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
import { Location } from '../../locations/entities/location.entity';

@Entity('areas')
@Index(['location_id'])
@Index(['parent_id'])
@Index(['location_id', 'parent_id'])
export class Area {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({ type: 'uuid' })
  location_id: string;
  @ManyToOne(() => Location, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'location_id' })
  location: Location;
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
  @Column({ type: 'varchar', length: 100 })
  name: string;
  @Column({ type: 'varchar', length: 50, default: '' })
  code: string;
  @Column({ type: 'text', default: '' })
  description: string;
  @Column({ type: 'boolean', default: true })
  is_active: boolean;
  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
