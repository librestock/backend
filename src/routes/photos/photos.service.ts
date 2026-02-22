import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { Photo } from './entities/photo.entity';
import { PhotoResponseDto } from './dto';
import { PhotoRepository } from './photos.repository';

const ALLOWED_MIMETYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

@Injectable()
export class PhotosService {
  private readonly logger = new Logger(PhotosService.name);
  private readonly uploadsDir: string;

  constructor(
    private readonly photoRepository: PhotoRepository,
    private readonly configService: ConfigService,
  ) {
    this.uploadsDir =
      this.configService.get<string>('UPLOADS_DIR') ||
      path.join(process.cwd(), 'uploads', 'photos');

    // Ensure the uploads directory exists
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  async uploadPhoto(
    productId: string,
    file: Express.Multer.File,
    userId?: string,
  ): Promise<PhotoResponseDto> {
    // Validate MIME type
    if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type: ${file.mimetype}. Allowed types: ${ALLOWED_MIMETYPES.join(', ')}`,
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File too large: ${file.size} bytes. Maximum allowed: ${MAX_FILE_SIZE} bytes`,
      );
    }

    // Generate a unique filename to avoid collisions
    const ext = path.extname(file.originalname) || this.getExtFromMime(file.mimetype);
    const uniqueName = `${productId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    const storagePath = path.join(this.uploadsDir, uniqueName);

    // Write file to disk
    fs.writeFileSync(storagePath, file.buffer);

    // Get display_order (next after max existing)
    const existingCount = await this.photoRepository.countByProductId(productId);

    const photo = await this.photoRepository.create({
      product_id: productId,
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      storage_path: storagePath,
      display_order: existingCount,
      uploaded_by: userId ?? null,
    });

    return this.toResponseDto(photo);
  }

  async findByProductId(productId: string): Promise<PhotoResponseDto[]> {
    const photos = await this.photoRepository.findByProductId(productId);
    return photos.map((photo) => this.toResponseDto(photo));
  }

  async findById(id: string): Promise<Photo> {
    const photo = await this.photoRepository.findById(id);
    if (!photo) {
      throw new NotFoundException('Photo not found');
    }
    return photo;
  }

  async getFilePath(id: string): Promise<{ filePath: string; mimetype: string; filename: string }> {
    const photo = await this.findById(id);

    if (!fs.existsSync(photo.storage_path)) {
      this.logger.warn(`Photo file not found on disk: ${photo.storage_path}`);
      throw new NotFoundException('Photo file not found on disk');
    }

    return {
      filePath: photo.storage_path,
      mimetype: photo.mimetype,
      filename: photo.filename,
    };
  }

  async deletePhoto(id: string): Promise<void> {
    const photo = await this.findById(id);

    // Remove file from disk
    if (fs.existsSync(photo.storage_path)) {
      fs.unlinkSync(photo.storage_path);
    }

    await this.photoRepository.delete(id);
  }

  private toResponseDto(photo: Photo): PhotoResponseDto {
    return {
      id: photo.id,
      product_id: photo.product_id,
      filename: photo.filename,
      mimetype: photo.mimetype,
      size: photo.size,
      storage_path: photo.storage_path,
      uploaded_by: photo.uploaded_by,
      display_order: photo.display_order,
      created_at: photo.created_at,
    };
  }

  private getExtFromMime(mimetype: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
    };
    return map[mimetype] ?? '.bin';
  }
}
