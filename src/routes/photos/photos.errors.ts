import { Data } from 'effect';

export class InvalidPhotoMimeType extends Data.TaggedError('InvalidPhotoMimeType')<{
  readonly mimetype: string;
  readonly message: string;
}> {
  readonly statusCode = 400 as const;
}

export class PhotoTooLarge extends Data.TaggedError('PhotoTooLarge')<{
  readonly size: number;
  readonly maxSize: number;
  readonly message: string;
}> {
  readonly statusCode = 400 as const;
}

export class PhotoNotFound extends Data.TaggedError('PhotoNotFound')<{
  readonly id: string;
  readonly message: string;
}> {
  readonly statusCode = 404 as const;
}

export class PhotoFileNotFound extends Data.TaggedError('PhotoFileNotFound')<{
  readonly id: string;
  readonly path: string;
  readonly message: string;
}> {
  readonly statusCode = 404 as const;
}

export class PhotosInfrastructureError extends Data.TaggedError(
  'PhotosInfrastructureError',
)<{
  readonly action: string;
  readonly cause?: unknown;
  readonly message: string;
}> {
  readonly statusCode = 500 as const;
}
