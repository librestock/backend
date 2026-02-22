import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Photo } from './entities/photo.entity';

@Injectable()
export class PhotoRepository {
  constructor(
    @InjectRepository(Photo)
    private readonly repository: Repository<Photo>,
  ) {}

  async findByProductId(productId: string): Promise<Photo[]> {
    return this.repository
      .createQueryBuilder('photo')
      .where('photo.product_id = :productId', { productId })
      .orderBy('photo.display_order', 'ASC')
      .addOrderBy('photo.created_at', 'ASC')
      .getMany();
  }

  async findById(id: string): Promise<Photo | null> {
    return this.repository
      .createQueryBuilder('photo')
      .where('photo.id = :id', { id })
      .getOne();
  }

  async create(data: Partial<Photo>): Promise<Photo> {
    const photo = this.repository.create(data);
    return this.repository.save(photo);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async countByProductId(productId: string): Promise<number> {
    return this.repository
      .createQueryBuilder('photo')
      .where('photo.product_id = :productId', { productId })
      .getCount();
  }
}
