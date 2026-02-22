import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { PhotosController } from './photos.controller';
import { PhotosService } from './photos.service';
import { PhotoRepository } from './photos.repository';
import { Photo } from './entities/photo.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Photo])],
  controllers: [PhotosController],
  providers: [PhotosService, PhotoRepository, PermissionGuard],
  exports: [PhotosService],
})
export class PhotosModule {}
