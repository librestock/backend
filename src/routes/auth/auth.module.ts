import { Module } from '@nestjs/common';
import { RolesModule } from '../roles/roles.module';
import { AuthController } from './auth.controller';

@Module({
  imports: [RolesModule],
  controllers: [AuthController],
})
export class AuthModule {}
