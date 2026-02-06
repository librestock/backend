import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditAction, AuditEntityType } from 'src/common/enums';
import { AuditLog, AuditChanges } from './entities/audit-log.entity';

export interface CreateAuditLogData {
  user_id: string | null;
  action: AuditAction;
  entity_type: AuditEntityType;
  entity_id: string;
  changes?: AuditChanges | null;
  ip_address?: string | null;
  user_agent?: string | null;
}

export interface AuditLogQueryOptions {
  entity_type?: AuditEntityType;
  entity_id?: string;
  user_id?: string;
  action?: AuditAction;
  from_date?: Date;
  to_date?: Date;
  page?: number;
  limit?: number;
}

export interface PaginatedAuditLogs {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

@Injectable()
export class AuditLogRepository {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repository: Repository<AuditLog>,
  ) {}

  async create(data: CreateAuditLogData): Promise<AuditLog> {
    const auditLog = this.repository.create(data);
    return this.repository.save(auditLog);
  }

  async createMany(dataArray: CreateAuditLogData[]): Promise<AuditLog[]> {
    const auditLogs = this.repository.create(dataArray);
    return this.repository.save(auditLogs);
  }

  async findByEntityId(
    entityType: AuditEntityType,
    entityId: string,
  ): Promise<AuditLog[]> {
    return this.repository.find({
      where: {
        entity_type: entityType,
        entity_id: entityId,
      },
      order: { created_at: 'DESC' },
    });
  }

  async findByUserId(userId: string): Promise<AuditLog[]> {
    return this.repository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
  }

  async findPaginated(
    options: AuditLogQueryOptions,
  ): Promise<PaginatedAuditLogs> {
    const {
      entity_type,
      entity_id,
      user_id,
      action,
      from_date,
      to_date,
      page = 1,
      limit = 20,
    } = options;

    const skip = (page - 1) * limit;

    const queryBuilder = this.repository.createQueryBuilder('audit_log');

    if (entity_type) {
      queryBuilder.andWhere('audit_log.entity_type = :entity_type', {
        entity_type,
      });
    }

    if (entity_id) {
      queryBuilder.andWhere('audit_log.entity_id = :entity_id', { entity_id });
    }

    if (user_id) {
      queryBuilder.andWhere('audit_log.user_id = :user_id', { user_id });
    }

    if (action) {
      queryBuilder.andWhere('audit_log.action = :action', { action });
    }

    if (from_date) {
      queryBuilder.andWhere('audit_log.created_at >= :from_date', {
        from_date,
      });
    }

    if (to_date) {
      queryBuilder.andWhere('audit_log.created_at <= :to_date', { to_date });
    }

    queryBuilder.orderBy('audit_log.created_at', 'DESC');

    const total = await queryBuilder.getCount();

    queryBuilder.skip(skip).take(limit);

    const data = await queryBuilder.getMany();

    return {
      data,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<AuditLog | null> {
    return this.repository.findOneBy({ id });
  }
}
