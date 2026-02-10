import type { IncomingHttpHeaders } from 'node:http';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { auth } from '../../auth';
import { UserRoleEntity } from './entities/user-role.entity';
import type { UserQueryDto } from './dto/user-query.dto';
import type { UserResponseDto } from './dto/user-response.dto';
import type { BanUserDto } from './dto/ban-user.dto';

interface PaginatedUsers {
  data: UserResponseDto[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

function toHeaders(incoming: IncomingHttpHeaders): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(incoming)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) headers.append(key, v);
    } else {
      headers.set(key, value);
    }
  }
  return headers;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserRoleEntity)
    private readonly userRoleRepository: Repository<UserRoleEntity>,
  ) {}

  async listUsers(query: UserQueryDto, headers: IncomingHttpHeaders): Promise<PaginatedUsers> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const searchQuery: Record<string, string> = {};
    if (query.search) {
      searchQuery.searchField = 'name';
      searchQuery.searchValue = query.search;
      searchQuery.searchOperator = 'contains';
    }

    const result = await auth.api.listUsers({
      headers: toHeaders(headers),
      query: {
        limit,
        offset,
        ...searchQuery,
      },
    });

    const users = result.users ?? [];
    const total = result.total ?? users.length;

    const userIds = users.map((u: { id: string }) => u.id);
    const roleEntities = userIds.length > 0
      ? await this.userRoleRepository.find({
          where: { user_id: In(userIds) },
          relations: ['role'],
        })
      : [];

    const rolesByUserId = new Map<string, string[]>();
    for (const re of roleEntities) {
      const arr = rolesByUserId.get(re.user_id) ?? [];
      arr.push(re.role.name);
      rolesByUserId.set(re.user_id, arr);
    }

    let data: UserResponseDto[] = users.map((u: Record<string, any>) => ({
      id: u.id,
      name: u.name ?? '',
      email: u.email ?? '',
      image: u.image ?? null,
      roles: rolesByUserId.get(u.id) ?? [],
      banned: u.banned ?? false,
      banReason: u.banReason ?? null,
      banExpires: u.banExpires ?? null,
      createdAt: u.createdAt,
    }));

    if (query.role) {
      data = data.filter((u) => u.roles.includes(query.role!));
    }

    const filteredTotal = query.role ? data.length : total;

    return {
      data,
      total: filteredTotal,
      page,
      limit,
      total_pages: Math.ceil(filteredTotal / limit),
    };
  }

  async getUser(id: string, headers: IncomingHttpHeaders): Promise<UserResponseDto> {
    const result = await auth.api.listUsers({
      headers: toHeaders(headers),
      query: {
        limit: 1,
        offset: 0,
        filterField: 'id',
        filterValue: id,
      },
    });

    const user = (result.users ?? [])[0] as Record<string, any> | undefined;
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const roleEntities = await this.userRoleRepository.find({
      where: { user_id: id },
      relations: ['role'],
    });

    return {
      id: user.id,
      name: user.name ?? '',
      email: user.email ?? '',
      image: user.image ?? null,
      roles: roleEntities.map((re) => re.role.name),
      banned: user.banned ?? false,
      banReason: user.banReason ?? null,
      banExpires: user.banExpires ?? null,
      createdAt: user.createdAt,
    };
  }

  async updateRoles(userId: string, roleIds: string[], headers: IncomingHttpHeaders): Promise<UserResponseDto> {
    // Verify user exists
    await this.getUser(userId, headers);

    // Replace all role assignments
    await this.userRoleRepository.delete({ user_id: userId });

    if (roleIds.length > 0) {
      const entities = roleIds.map((roleId) =>
        this.userRoleRepository.create({ user_id: userId, role_id: roleId }),
      );
      await this.userRoleRepository.save(entities);
    }

    return this.getUser(userId, headers);
  }

  async banUser(userId: string, dto: BanUserDto, headers: IncomingHttpHeaders): Promise<UserResponseDto> {
    await this.getUser(userId, headers);

    const banData: Record<string, unknown> = { userId };
    if (dto.reason) {
      banData.banReason = dto.reason;
    }
    if (dto.expiresAt) {
      banData.banExpiresIn = Math.max(
        0,
        Math.floor((new Date(dto.expiresAt).getTime() - Date.now()) / 1000),
      );
    }

    await auth.api.banUser({ headers: toHeaders(headers), body: banData as any });

    return this.getUser(userId, headers);
  }

  async unbanUser(userId: string, headers: IncomingHttpHeaders): Promise<UserResponseDto> {
    await this.getUser(userId, headers);
    await auth.api.unbanUser({ headers: toHeaders(headers), body: { userId } as any });
    return this.getUser(userId, headers);
  }

  async deleteUser(userId: string, headers: IncomingHttpHeaders): Promise<void> {
    await this.getUser(userId, headers);
    await this.userRoleRepository.delete({ user_id: userId });
    await auth.api.removeUser({ headers: toHeaders(headers), body: { userId } as any });
  }

  async revokeSessions(userId: string, headers: IncomingHttpHeaders): Promise<void> {
    await this.getUser(userId, headers);
    await auth.api.revokeUserSessions({ headers: toHeaders(headers), body: { userId } as any });
  }
}
