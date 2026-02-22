import { Global, Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleEntity } from './entities/role.entity';
import { RolePermissionEntity } from './entities/role-permission.entity';
import { RolesRepository } from './roles.repository';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([RoleEntity, RolePermissionEntity])],
  controllers: [RolesController],
  providers: [RolesService, RolesRepository],
  exports: [RolesService],
})
export class RolesModule implements OnModuleInit {
  constructor(private readonly rolesService: RolesService) {}

  async onModuleInit(): Promise<void> {
    await this.rolesService.seed();
  }
}
