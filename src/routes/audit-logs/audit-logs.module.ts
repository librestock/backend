import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { AuditLog } from './entities/audit-log.entity';
import { AuditLogRepository } from './audit-log.repository';
import { AuditLogService } from './audit-log.service';
import { AuditLogsController } from './audit-logs.controller';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  controllers: [AuditLogsController],
  providers: [
    AuditLogRepository,
    AuditLogService,
    AuditInterceptor,
    PermissionGuard,
  ],
  exports: [AuditLogService, AuditInterceptor],
})
export class AuditLogsModule {}
