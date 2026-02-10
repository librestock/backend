import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Permission, Resource } from '@librestock/types';
import { RolesRepository } from './roles.repository';
import { RoleEntity } from './entities/role.entity';
import type { CreateRoleDto } from './dto/create-role.dto';
import type { UpdateRoleDto } from './dto/update-role.dto';
import type { RoleResponseDto } from './dto/role-response.dto';

interface UserPermissions {
  roleNames: string[];
  permissions: Partial<Record<Resource, Permission[]>>;
}

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly dataSource: DataSource,
  ) {}

  private toResponse(entity: RoleEntity): RoleResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      is_system: entity.is_system,
      permissions: (entity.permissions ?? []).map((p) => ({
        resource: p.resource as Resource,
        permission: p.permission as Permission,
      })),
      created_at: entity.created_at,
      updated_at: entity.updated_at,
    };
  }

  async findAll(): Promise<RoleResponseDto[]> {
    const roles = await this.rolesRepository.findAll();
    return roles.map((r) => this.toResponse(r));
  }

  async findById(id: string): Promise<RoleResponseDto> {
    const role = await this.rolesRepository.findById(id);
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
    return this.toResponse(role);
  }

  async create(dto: CreateRoleDto): Promise<RoleResponseDto> {
    const existing = await this.rolesRepository.findByName(dto.name);
    if (existing) {
      throw new ConflictException(`Role with name "${dto.name}" already exists`);
    }

    const role = await this.rolesRepository.create({
      name: dto.name,
      description: dto.description ?? null,
      is_system: false,
    });

    await this.rolesRepository.replacePermissions(role.id, dto.permissions);

    return this.findById(role.id);
  }

  async update(id: string, dto: UpdateRoleDto): Promise<RoleResponseDto> {
    const role = await this.rolesRepository.findById(id);
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    if (dto.name && dto.name !== role.name) {
      const existing = await this.rolesRepository.findByName(dto.name);
      if (existing) {
        throw new ConflictException(
          `Role with name "${dto.name}" already exists`,
        );
      }
    }

    const updateData: Partial<RoleEntity> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined)
      updateData.description = dto.description ?? null;

    if (Object.keys(updateData).length > 0) {
      await this.rolesRepository.update(id, updateData);
    }

    if (dto.permissions !== undefined) {
      await this.rolesRepository.replacePermissions(id, dto.permissions);
    }

    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    const role = await this.rolesRepository.findById(id);
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
    if (role.is_system) {
      throw new BadRequestException('System roles cannot be deleted');
    }
    await this.rolesRepository.delete(id);
  }

  async getPermissionsForUser(userId: string): Promise<UserPermissions> {
    const rows: { role_name: string; resource: string; permission: string }[] =
      await this.dataSource.query(
        `SELECT r.name AS role_name, rp.resource, rp.permission
         FROM user_roles ur
         JOIN roles r ON r.id = ur.role_id
         JOIN role_permissions rp ON rp.role_id = ur.role_id
         WHERE ur.user_id = $1`,
        [userId],
      );

    const roleNames = [...new Set(rows.map((r) => r.role_name))];
    const permMap: Record<string, Set<string>> = {};

    for (const row of rows) {
      permMap[row.resource] ??= new Set();
      permMap[row.resource].add(row.permission);
    }

    const permissions: Partial<Record<Resource, Permission[]>> = {};
    for (const [resource, permSet] of Object.entries(permMap)) {
      permissions[resource as Resource] = [...permSet] as Permission[];
    }

    return { roleNames, permissions };
  }

  async seed(): Promise<void> {
    const seedRoles: {
      name: string;
      description: string;
      permissions: { resource: Resource; permission: Permission }[];
    }[] = [
      {
        name: 'Admin',
        description: 'Full system access',
        permissions: [
          { resource: Resource.DASHBOARD, permission: Permission.READ },
          { resource: Resource.STOCK, permission: Permission.READ },
          { resource: Resource.STOCK, permission: Permission.WRITE },
          { resource: Resource.PRODUCTS, permission: Permission.READ },
          { resource: Resource.PRODUCTS, permission: Permission.WRITE },
          { resource: Resource.LOCATIONS, permission: Permission.READ },
          { resource: Resource.LOCATIONS, permission: Permission.WRITE },
          { resource: Resource.INVENTORY, permission: Permission.READ },
          { resource: Resource.INVENTORY, permission: Permission.WRITE },
          { resource: Resource.AUDIT_LOGS, permission: Permission.READ },
          { resource: Resource.USERS, permission: Permission.READ },
          { resource: Resource.USERS, permission: Permission.WRITE },
          { resource: Resource.SETTINGS, permission: Permission.READ },
          { resource: Resource.SETTINGS, permission: Permission.WRITE },
          { resource: Resource.ROLES, permission: Permission.READ },
          { resource: Resource.ROLES, permission: Permission.WRITE },
        ],
      },
      {
        name: 'Warehouse Manager',
        description: 'Manage warehouse operations',
        permissions: [
          { resource: Resource.DASHBOARD, permission: Permission.READ },
          { resource: Resource.STOCK, permission: Permission.READ },
          { resource: Resource.STOCK, permission: Permission.WRITE },
          { resource: Resource.PRODUCTS, permission: Permission.READ },
          { resource: Resource.PRODUCTS, permission: Permission.WRITE },
          { resource: Resource.LOCATIONS, permission: Permission.READ },
          { resource: Resource.LOCATIONS, permission: Permission.WRITE },
          { resource: Resource.INVENTORY, permission: Permission.READ },
          { resource: Resource.INVENTORY, permission: Permission.WRITE },
          { resource: Resource.SETTINGS, permission: Permission.READ },
          { resource: Resource.SETTINGS, permission: Permission.WRITE },
        ],
      },
      {
        name: 'Picker',
        description: 'Pick and manage inventory',
        permissions: [
          { resource: Resource.DASHBOARD, permission: Permission.READ },
          { resource: Resource.STOCK, permission: Permission.READ },
          { resource: Resource.PRODUCTS, permission: Permission.READ },
          { resource: Resource.LOCATIONS, permission: Permission.READ },
          { resource: Resource.INVENTORY, permission: Permission.READ },
          { resource: Resource.INVENTORY, permission: Permission.WRITE },
          { resource: Resource.SETTINGS, permission: Permission.READ },
          { resource: Resource.SETTINGS, permission: Permission.WRITE },
        ],
      },
      {
        name: 'Sales',
        description: 'View stock and products',
        permissions: [
          { resource: Resource.DASHBOARD, permission: Permission.READ },
          { resource: Resource.STOCK, permission: Permission.READ },
          { resource: Resource.PRODUCTS, permission: Permission.READ },
          { resource: Resource.INVENTORY, permission: Permission.READ },
          { resource: Resource.SETTINGS, permission: Permission.READ },
          { resource: Resource.SETTINGS, permission: Permission.WRITE },
        ],
      },
    ];

    for (const seed of seedRoles) {
      const existing = await this.rolesRepository.findByName(seed.name);
      if (existing) {
        continue;
      }

      this.logger.log(`Seeding system role: ${seed.name}`);
      const role = await this.rolesRepository.create({
        name: seed.name,
        description: seed.description,
        is_system: true,
      });
      await this.rolesRepository.replacePermissions(role.id, seed.permissions);
    }
  }
}
