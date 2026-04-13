import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { access, mkdir, unlink, writeFile } from 'node:fs/promises';
import { Effect } from 'effect';
import type { PhotoResponseDto } from '@librestock/types/photos';
import { fromNullOr } from '../../platform/from-null-or';
import { toPhotoResponseDto } from './photos.utils';
import {
  InvalidPhotoMimeType,
  PhotoFileNotFound,
  PhotoNotFound,
  PhotoTooLarge,
  PhotosInfrastructureError,
} from './photos.errors';
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

const MAGIC_SIGNATURES: Record<string, { bytes: number[]; offset: number }[]> =
  {
    'image/jpeg': [{ bytes: [0xff, 0xd8, 0xff], offset: 0 }],
    'image/png': [{ bytes: [0x89, 0x50, 0x4e, 0x47], offset: 0 }],
    'image/gif': [{ bytes: [0x47, 0x49, 0x46, 0x38], offset: 0 }],
    'image/webp': [
      { bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 },
      { bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 },
    ],
  };

function matchesMagicBytes(buffer: Buffer, declaredMime: string): boolean {
  const signatures = MAGIC_SIGNATURES[declaredMime];
  if (!signatures) return false;

  return signatures.every(({ bytes, offset }) =>
    bytes.every((byte, i) => buffer[offset + i] === byte),
  );
}

export interface UploadedFile {
  readonly originalname: string;
  readonly mimetype: string;
  readonly size: number;
  readonly buffer: Buffer;
}

export class PhotosService extends Effect.Service<PhotosService>()(
  '@librestock/effect/PhotosService',
  {
    effect: Effect.gen(function* () {
      const repository = yield* PhotosRepository;

      const uploadsDir =
        process.env.UPLOADS_DIR ??
        path.join(process.cwd(), 'uploads', 'photos');

      const ensureUploadsDir = () => mkdir(uploadsDir, { recursive: true });

      const safeUnlink = (storagePath: string) =>
        Effect.tryPromise({
          try: () => unlink(storagePath),
          catch: (error) => error,
        }).pipe(
          Effect.catchIf(
            (error) => (error as NodeJS.ErrnoException).code === 'ENOENT',
            () => Effect.void,
          ),
        );

      const getExtFromMime = (mimetype: string): string =>
        MIME_EXT_MAP[mimetype] ?? '.bin';

      const findPhotoOrFail = (id: string) =>
        fromNullOr(
          repository.findById(id),
          () => new PhotoNotFound({ id, messageKey: 'photos.notFound' }),
        );

      const uploadPhoto = (
        productId: string,
        file: UploadedFile,
        userId?: string,
      ): Effect.Effect<
        PhotoResponseDto,
        InvalidPhotoMimeType | PhotoTooLarge | PhotosInfrastructureError
      > => {
        if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
          return Effect.fail(
            new InvalidPhotoMimeType({
              mimetype: file.mimetype,
              messageKey: 'photos.invalidMimeType',
              messageArgs: { allowedTypes: ALLOWED_MIMETYPES.join(', ') },
            }),
          );
        }

        if (!matchesMagicBytes(file.buffer, file.mimetype)) {
          return Effect.fail(
            new InvalidPhotoMimeType({
              mimetype: file.mimetype,
              messageKey: 'photos.invalidMimeType',
              messageArgs: { allowedTypes: ALLOWED_MIMETYPES.join(', ') },
            }),
          );
        }

        if (file.size > MAX_FILE_SIZE) {
          return Effect.fail(
            new PhotoTooLarge({
              size: file.size,
              maxSize: MAX_FILE_SIZE,
              messageKey: 'photos.tooLarge',
              messageArgs: { maxSize: MAX_FILE_SIZE },
            }),
          );
        }

        const ext =
          path.extname(file.originalname) || getExtFromMime(file.mimetype);
        const uniqueName = `${productId}_${crypto.randomUUID()}${ext}`;
        const storagePath = path.join(uploadsDir, uniqueName);

        return Effect.gen(function* () {
          yield* Effect.tryPromise({
            try: async () => {
              await ensureUploadsDir();
              await writeFile(storagePath, file.buffer);
            },
            catch: (cause) =>
              new PhotosInfrastructureError({
                action: 'write photo file',
                cause,
                messageKey: 'photos.writeFailed',
              }),
          });

          const existingCount = yield* repository.countByProductId(productId);
          const photo = yield* Effect.catchAll(
            repository.create({
              product_id: productId,
              filename: file.originalname,
              mimetype: file.mimetype,
              size: file.size,
              storage_path: storagePath,
              display_order: existingCount,
              uploaded_by: userId ?? null,
            }),
            (error) =>
              Effect.flatMap(
                safeUnlink(storagePath).pipe(
                  Effect.catchAll(() => Effect.void),
                ),
                () => Effect.fail(error),
              ),
          );

          return toPhotoResponseDto(photo);
        }).pipe(
          Effect.withSpan('PhotosService.uploadPhoto', {
            attributes: { productId },
          }),
        );
      };

      const findByProductId = (
        productId: string,
      ): Effect.Effect<PhotoResponseDto[], PhotosInfrastructureError> =>
        Effect.map(repository.findByProductId(productId), (photos) =>
          photos.map(toPhotoResponseDto),
        ).pipe(
          Effect.withSpan('PhotosService.findByProductId', {
            attributes: { productId },
          }),
        );

      const getFilePath = (
        id: string,
      ): Effect.Effect<
        { filePath: string; mimetype: string; filename: string },
        PhotoFileNotFound | PhotoNotFound | PhotosInfrastructureError
      > =>
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
                messageKey: 'photos.existenceCheckFailed',
              }),
          });

          if (!accessible) {
            return yield* Effect.fail(
              new PhotoFileNotFound({
                id,
                path: photo.storage_path,
                messageKey: 'photos.fileNotFound',
              }),
            );
          }

          return {
            filePath: photo.storage_path,
            mimetype: photo.mimetype,
            filename: photo.filename,
          };
        }).pipe(
          Effect.withSpan('PhotosService.getFilePath', { attributes: { id } }),
        );

      const deletePhoto = (
        id: string,
      ): Effect.Effect<void, PhotoNotFound | PhotosInfrastructureError> =>
        Effect.gen(function* () {
          const photo = yield* findPhotoOrFail(id);
          yield* safeUnlink(photo.storage_path).pipe(
            Effect.catchAll((cause) =>
              Effect.fail(
                new PhotosInfrastructureError({
                  action: 'delete photo file',
                  cause,
                  messageKey: 'photos.deleteFailed',
                }),
              ),
            ),
          );
          yield* repository.delete(id);
        }).pipe(
          Effect.withSpan('PhotosService.deletePhoto', { attributes: { id } }),
        );

      return { uploadPhoto, findByProductId, getFilePath, deletePhoto };
    }),
    dependencies: [PhotosRepository.Default],
  },
) {}
