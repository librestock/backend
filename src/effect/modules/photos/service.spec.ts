import { Effect, Layer } from 'effect';
import { PhotosService } from './service';
import { PhotosRepository } from './repository';

const makePhotoEntity = (overrides: Record<string, any> = {}) => ({
  id: 'photo-1',
  product_id: 'prod-1',
  filename: 'test.jpg',
  mimetype: 'image/jpeg',
  size: 1024,
  storage_path: '/uploads/photos/test.jpg',
  display_order: 0,
  uploaded_by: null,
  created_at: new Date('2026-01-01'),
  ...overrides,
});

const makeMockRepository = (
  overrides: Record<string, jest.Mock> = {},
) => ({
  findByProductId: jest.fn().mockReturnValue(Effect.succeed([makePhotoEntity()])),
  findById: jest.fn().mockReturnValue(Effect.succeed(makePhotoEntity())),
  create: jest.fn().mockReturnValue(Effect.succeed(makePhotoEntity())),
  delete: jest.fn().mockReturnValue(Effect.succeed(undefined)),
  countByProductId: jest.fn().mockReturnValue(Effect.succeed(0)),
  ...overrides,
});

const buildService = (repo = makeMockRepository()) =>
  Effect.runPromise(
    PhotosService.pipe(
      Effect.provide(
        PhotosService.DefaultWithoutDependencies.pipe(
          Layer.provide(
            Layer.succeed(PhotosRepository, repo as any),
          ),
        ),
      ),
    ),
  );

const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);
const fail = <A, E>(effect: Effect.Effect<A, E>) =>
  Effect.runPromise(Effect.flip(effect));

describe('Effect PhotosService', () => {
  describe('uploadPhoto', () => {
    it('rejects invalid mimetype', async () => {
      const service = await buildService();
      const effect = service.uploadPhoto('prod-1', {
        originalname: 'test.txt',
        mimetype: 'text/plain',
        size: 100,
        buffer: Buffer.from('test'),
      }, undefined) as Effect.Effect<any, any>;
      const error = await Effect.runPromise(Effect.flip(effect));
      expect(error).toMatchObject({ _tag: 'InvalidPhotoMimeType' });
    });

    it('rejects oversized files', async () => {
      const service = await buildService();
      const effect = service.uploadPhoto('prod-1', {
        originalname: 'large.jpg',
        mimetype: 'image/jpeg',
        size: 11 * 1024 * 1024,
        buffer: Buffer.alloc(0),
      }, undefined) as Effect.Effect<any, any>;
      const error = await Effect.runPromise(Effect.flip(effect));
      expect(error).toMatchObject({ _tag: 'PhotoTooLarge' });
    });
  });

  describe('findByProductId', () => {
    it('returns photos for a product', async () => {
      const service = await buildService();
      const result = await run(service.findByProductId('prod-1'));
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: 'photo-1' });
    });
  });

  describe('getFilePath', () => {
    it('fails with PhotoNotFound', async () => {
      const repo = makeMockRepository({
        findById: jest.fn().mockReturnValue(Effect.succeed(null)),
      });
      const service = await buildService(repo);
      const error = await fail(service.getFilePath('missing'));
      expect(error).toMatchObject({ _tag: 'PhotoNotFound' });
    });
  });

  describe('deletePhoto', () => {
    it('fails with PhotoNotFound', async () => {
      const repo = makeMockRepository({
        findById: jest.fn().mockReturnValue(Effect.succeed(null)),
      });
      const service = await buildService(repo);
      const error = await fail(service.deletePhoto('missing'));
      expect(error).toMatchObject({ _tag: 'PhotoNotFound' });
    });
  });
});
