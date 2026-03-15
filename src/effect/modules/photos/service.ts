import * as path from 'node:path';
import { access, mkdir, unlink, writeFile } from 'node:fs/promises';
import { Context, Effect } from 'effect';
import type { PhotoResponseDto } from '../../../routes/photos/dto';
import { photoTryAsync, toPhotoResponseDto } from '../../../routes/photos/photos.utils';
import {
  InvalidPhotoMimeType,
  PhotoFileNotFound,
  PhotoNotFound,
  PhotoTooLarge,
  PhotosInfrastructureError,
} from '../../../routes/photos/photos.errors';
import type { Photo } from '../../../routes/photos/entities/photo.entity';
import { PhotosRepository } from './repository';

const ALLOWED_MIMETYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const MIME_EXT_MAP: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

export interface UploadedFile {
  readonly originalname: string;
  readonly mimetype: string;
  readonly size: number;
  readonly buffer: Buffer;
}

export interface PhotosService {
  readonly uploadPhoto: (
    productId: string,
    file: UploadedFile,
    userId?: string,
  ) => Effect.Effect<
    PhotoResponseDto,
    InvalidPhotoMimeType | PhotoTooLarge | PhotosInfrastructureError
  >;
  readonly findByProductId: (
    productId: string,
  ) => Effect.Effect<PhotoResponseDto[], PhotosInfrastructureError>;
  readonly getFilePath: (
    id: string,
  ) => Effect.Effect<
    { filePath: string; mimetype: string; filename: string },
    PhotoFileNotFound | PhotoNotFound | PhotosInfrastructureError
  >;
  readonly deletePhoto: (
    id: string,
  ) => Effect.Effect<void, PhotoNotFound | PhotosInfrastructureError>;
}

export const PhotosService = Context.GenericTag<PhotosService>(
  '@librestock/effect/PhotosService',
);

export const makePhotosService = Effect.gen(function* () {
  const repository = yield* PhotosRepository;

  const uploadsDir =
    process.env.UPLOADS_DIR ??
    path.join(process.cwd(), 'uploads', 'photos');

  const ensureUploadsDir = () => mkdir(uploadsDir, { recursive: true });

  const safeUnlink = async (storagePath: string) => {
    try {
      await unlink(storagePath);
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  };

  const getExtFromMime = (mimetype: string): string =>
    MIME_EXT_MAP[mimetype] ?? '.bin';

  const findPhotoOrFail = (
    id: string,
  ): Effect.Effect<Photo, PhotoNotFound | PhotosInfrastructureError> =>
    Effect.flatMap(
      photoTryAsync('load photo', () => repository.findById(id)),
      (photo) =>
        photo
          ? Effect.succeed(photo)
          : Effect.fail(new PhotoNotFound({ id, message: 'Photo not found' })),
    );

  return {
    uploadPhoto: (productId, file, userId) => {
      if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
        return Effect.fail(
          new InvalidPhotoMimeType({
            mimetype: file.mimetype,
            message: `Invalid file type: ${file.mimetype}. Allowed types: ${ALLOWED_MIMETYPES.join(', ')}`,
          }),
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return Effect.fail(
          new PhotoTooLarge({
            size: file.size,
            maxSize: MAX_FILE_SIZE,
            message: `File too large: ${file.size} bytes. Maximum allowed: ${MAX_FILE_SIZE} bytes`,
          }),
        );
      }

      const ext =
        path.extname(file.originalname) || getExtFromMime(file.mimetype);
      const uniqueName = `${productId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
      const storagePath = path.join(uploadsDir, uniqueName);

      return Effect.tryPromise({
        try: async () => {
          await ensureUploadsDir();
          await writeFile(storagePath, file.buffer);

          try {
            const existingCount =
              await repository.countByProductId(productId);
            const photo = await repository.create({
              product_id: productId,
              filename: file.originalname,
              mimetype: file.mimetype,
              size: file.size,
              storage_path: storagePath,
              display_order: existingCount,
              uploaded_by: userId ?? null,
            });

            return toPhotoResponseDto(photo);
          } catch (error) {
            await safeUnlink(storagePath);
            throw error;
          }
        },
        catch: (cause) =>
          new PhotosInfrastructureError({
            action: 'upload photo',
            cause,
            message: 'Photos service failed to upload photo',
          }),
      });
    },
    findByProductId: (productId) =>
      Effect.map(
        photoTryAsync('list photos by product', () =>
          repository.findByProductId(productId),
        ),
        (photos) => photos.map(toPhotoResponseDto),
      ),
    getFilePath: (id) =>
      Effect.gen(function* () {
        const photo = yield* findPhotoOrFail(id);

        const accessible = yield* Effect.tryPromise({
          try: () =>
            access(photo.storage_path).then(
              () => true,
              () => false,
            ),
          catch: (cause) =>
            new PhotosInfrastructureError({
              action: 'check photo file existence',
              cause,
              message: 'Photos service failed to check photo file existence',
            }),
        });

        if (!accessible) {
          return yield* Effect.fail(
            new PhotoFileNotFound({
              id,
              path: photo.storage_path,
              message: 'Photo file not found on disk',
            }),
          );
        }

        return {
          filePath: photo.storage_path,
          mimetype: photo.mimetype,
          filename: photo.filename,
        };
      }),
    deletePhoto: (id) =>
      Effect.gen(function* () {
        const photo = yield* findPhotoOrFail(id);
        yield* photoTryAsync('delete photo file', () =>
          safeUnlink(photo.storage_path),
        );
        yield* photoTryAsync('delete photo metadata', () =>
          repository.delete(id),
        );
      }),
  } satisfies PhotosService;
});
