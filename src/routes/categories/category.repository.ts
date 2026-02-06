import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';

@Injectable()
export class CategoryRepository {
  constructor(
    @InjectRepository(Category)
    private readonly repository: Repository<Category>,
  ) {}

  async findAll(): Promise<Category[]> {
    return this.repository.find({
      order: { name: 'ASC' },
    });
  }

  async findById(id: string): Promise<Category | null> {
    return this.repository.findOneBy({ id });
  }

  async existsById(id: string): Promise<boolean> {
    return this.repository.existsBy({ id });
  }

  async existsByName(name: string, parentId?: string | null): Promise<boolean> {
    const count = await this.repository.countBy({
      name,
      parent_id: parentId ?? undefined,
    });
    return count > 0;
  }

  async create(createData: Partial<Category>): Promise<Category> {
    const category = this.repository.create(createData);
    return this.repository.save(category);
  }

  async update(id: string, updateData: Partial<Category>): Promise<number> {
    const result = await this.repository
      .createQueryBuilder()
      .update(Category)
      .set(updateData)
      .where('id = :id', { id })
      .execute();
    return result.affected ?? 0;
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async findOne(options: any): Promise<Category | null> {
    return this.repository.findOne(options);
  }

  async findAllDescendantIds(parentId: string): Promise<string[]> {
    const allCategories = await this.repository.find({
      select: ['id', 'parent_id'],
    });

    const childIds: string[] = [];
    const findChildren = (currentParentId: string) => {
      for (const category of allCategories) {
        if (category.parent_id === currentParentId) {
          childIds.push(category.id);
          findChildren(category.id);
        }
      }
    };
    findChildren(parentId);
    return childIds;
  }
}
