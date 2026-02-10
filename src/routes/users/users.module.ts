import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { UserRoleEntity } from './entities/user-role.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserRoleEntity])],
  controllers: [UsersController],
  providers: [UsersService, PermissionGuard],
  exports: [UsersService],
})
export class UsersModule {}
