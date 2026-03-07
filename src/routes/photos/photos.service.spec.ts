import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { access, readdir, rm, writeFile } from 'node:fs/promises';
import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { PhotosService } from './photos.service';
import { PhotoRepository } from './photos.repository';
import { type Photo } from './entities/photo.entity';

function makeMulterFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'sample.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 4,
    destination: '',
    filename: '',
    path: '',
    buffer: Buffer.from('test'),
    stream: null as never,
    ...overrides,
  };
}

describe('PhotosService', () => {
  let service: PhotosService;
  let photoRepository: jest.Mocked<PhotoRepository>;
  let uploadsDir: string;

  beforeEach(async () => {
    uploadsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'librestock-photos-'));

    const mockPhotoRepository = {
      findByProductId: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      countByProductId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PhotosService,
        { provide: PhotoRepository, useValue: mockPhotoRepository },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'UPLOADS_DIR') {
                return uploadsDir;
              }
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<PhotosService>(PhotosService);
    photoRepository = module.get(PhotoRepository);
  });

  afterEach(async () => {
    await rm(uploadsDir, { recursive: true, force: true });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadPhoto', () => {
    it('writes file and persists photo metadata', async () => {
      photoRepository.countByProductId.mockResolvedValue(0);
      photoRepository.create.mockImplementation(async (data) => {
        return {
          id: 'photo-001',
          product_id: data.product_id!,
          filename: data.filename!,
          mimetype: data.mimetype!,
          size: data.size!,
          storage_path: data.storage_path!,
          display_order: data.display_order!,
          uploaded_by: data.uploaded_by ?? null,
          created_at: new Date('2026-03-01T00:00:00.000Z'),
          product: null as never,
        } satisfies Photo;
      });

      const result = await service.uploadPhoto(
        'product-001',
        makeMulterFile(),
        'user-001',
      );

      expect(result.product_id).toBe('product-001');
      expect(result.uploaded_by).toBe('user-001');
      expect(photoRepository.create).toHaveBeenCalledTimes(1);

      const [createPayload] = photoRepository.create.mock.calls[0];
      await expect(access(createPayload.storage_path!)).resolves.toBeUndefined();
    });

    it('cleans up uploaded file when db create fails', async () => {
      photoRepository.countByProductId.mockResolvedValue(0);
      photoRepository.create.mockRejectedValue(new Error('db insert failed'));

      await expect(
        service.uploadPhoto('product-001', makeMulterFile()),
      ).rejects.toThrow('db insert failed');

      const files = await readdir(uploadsDir);
      expect(files).toHaveLength(0);
    });
  });

  describe('getFilePath', () => {
    it('throws when file does not exist on disk', async () => {
      photoRepository.findById.mockResolvedValue({
        id: 'photo-404',
        product_id: 'product-001',
        filename: 'missing.jpg',
        mimetype: 'image/jpeg',
        size: 3,
        storage_path: path.join(uploadsDir, 'missing.jpg'),
        display_order: 0,
        uploaded_by: null,
        created_at: new Date(),
        product: null as never,
      });

      await expect(service.getFilePath('photo-404')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deletePhoto', () => {
    it('deletes the file asynchronously and removes db record', async () => {
      const storagePath = path.join(uploadsDir, 'photo.jpg');
      await writeFile(storagePath, Buffer.from('photo-data'));

      photoRepository.findById.mockResolvedValue({
        id: 'photo-001',
        product_id: 'product-001',
        filename: 'photo.jpg',
        mimetype: 'image/jpeg',
        size: 9,
        storage_path: storagePath,
        display_order: 0,
        uploaded_by: null,
        created_at: new Date(),
        product: null as never,
      });
      photoRepository.delete.mockResolvedValue();

      await service.deletePhoto('photo-001');

      await expect(access(storagePath)).rejects.toThrow();
      expect(photoRepository.delete).toHaveBeenCalledWith('photo-001');
    });
  });
});
