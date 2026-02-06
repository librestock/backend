import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Area } from './entities/area.entity';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';
import { AreaQueryDto } from './dto/area-query.dto';

@Injectable()
export class AreaRepository {
  constructor(
    @InjectRepository(Area)
    private readonly repository: Repository<Area>,
  ) {}

  async create(dto: CreateAreaDto): Promise<Area> {
    const area = this.repository.create({
      ...dto,
      parent_id: dto.parent_id ?? null,
      code: dto.code ?? '',
      description: dto.description ?? '',
      is_active: dto.is_active ?? true,
    });
    return this.repository.save(area);
  }

  async findAll(query: AreaQueryDto): Promise<Area[]> {
    const qb = this.repository.createQueryBuilder('area');

    if (query.location_id) {
      qb.andWhere('area.location_id = :location_id', {
        location_id: query.location_id,
      });
    }

    if (query.parent_id) {
      qb.andWhere('area.parent_id = :parent_id', {
        parent_id: query.parent_id,
      });
    }

    if (query.root_only) {
      qb.andWhere('area.parent_id IS NULL');
    }

    if (query.is_active !== undefined) {
      qb.andWhere('area.is_active = :is_active', {
        is_active: query.is_active,
      });
    }

    qb.orderBy('area.name', 'ASC');

    return qb.getMany();
  }

  async findById(id: string): Promise<Area | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['location'],
    });
  }

  async findByIdWithChildren(id: string): Promise<Area | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['location', 'children'],
    });
  }

  async findByLocationId(locationId: string): Promise<Area[]> {
    return this.repository.find({
      where: { location_id: locationId },
      order: { name: 'ASC' },
    });
  }

  async findRootAreasByLocationId(locationId: string): Promise<Area[]> {
    return this.repository.find({
      where: {
        location_id: locationId,
        parent_id: IsNull(),
      },
      relations: ['children'],
      order: { name: 'ASC' },
    });
  }

  async findHierarchyByLocationId(locationId: string): Promise<Area[]> {
    // Get root areas with nested children using recursive loading
    const rootAreas = await this.repository.find({
      where: {
        location_id: locationId,
        parent_id: IsNull(),
      },
      order: { name: 'ASC' },
    });

    // Recursively load children for each root area
    for (const area of rootAreas) {
      await this.loadChildrenRecursively(area);
    }

    return rootAreas;
  }

  private async loadChildrenRecursively(area: Area): Promise<void> {
    const children = await this.repository.find({
      where: { parent_id: area.id },
      order: { name: 'ASC' },
    });

    area.children = children;

    for (const child of children) {
      await this.loadChildrenRecursively(child);
    }
  }

  async update(id: string, dto: UpdateAreaDto): Promise<Area | null> {
    const area = await this.findById(id);
    if (!area) {
      return null;
    }

    Object.assign(area, dto);
    return this.repository.save(area);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async existsById(id: string): Promise<boolean> {
    const count = await this.repository.count({ where: { id } });
    return count > 0;
  }

  async existsByLocationId(locationId: string): Promise<boolean> {
    const count = await this.repository.count({
      where: { location_id: locationId },
    });
    return count > 0;
  }
}
