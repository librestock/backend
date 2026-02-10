import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleEntity } from './entities/role.entity';
import { RolePermissionEntity } from './entities/role-permission.entity';

@Injectable()
export class RolesRepository {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepo: Repository<RoleEntity>,
    @InjectRepository(RolePermissionEntity)
    private readonly permRepo: Repository<RolePermissionEntity>,
  ) {}

  async findAll(): Promise<RoleEntity[]> {
    return this.roleRepo.find({ order: { name: 'ASC' } });
  }

  async findById(id: string): Promise<RoleEntity | null> {
    return this.roleRepo.findOne({ where: { id } });
  }

  async findByName(name: string): Promise<RoleEntity | null> {
    return this.roleRepo.findOne({ where: { name } });
  }

  async create(data: Partial<RoleEntity>): Promise<RoleEntity> {
    const entity = this.roleRepo.create(data);
    return this.roleRepo.save(entity);
  }

  async update(id: string, data: Partial<RoleEntity>): Promise<void> {
    await this.roleRepo.update(id, data);
  }

  async delete(id: string): Promise<void> {
    await this.roleRepo.delete(id);
  }

  async replacePermissions(
    roleId: string,
    permissions: { resource: string; permission: string }[],
  ): Promise<void> {
    await this.permRepo.delete({ role_id: roleId });
    if (permissions.length > 0) {
      const entities = permissions.map((p) =>
        this.permRepo.create({
          role_id: roleId,
          resource: p.resource,
          permission: p.permission,
        }),
      );
      await this.permRepo.save(entities);
    }
  }
}
