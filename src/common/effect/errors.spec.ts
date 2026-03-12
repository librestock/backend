import {
  NotFoundError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
  InternalError,
  isAppError,
} from './errors';

describe('Effect domain errors', () => {
  class ProductNotFound extends NotFoundError('ProductNotFound') {}
  class DuplicateSku extends BadRequestError('DuplicateSku') {}
  class SkuConflict extends ConflictError('SkuConflict') {}
  class AccessDenied extends ForbiddenError('AccessDenied') {}
  class NotAuthenticated extends UnauthorizedError('NotAuthenticated') {}
  class DbFailure extends InternalError('DbFailure') {}

  it.each([
    { Cls: ProductNotFound, tag: 'ProductNotFound', status: 404 },
    { Cls: DuplicateSku, tag: 'DuplicateSku', status: 400 },
    { Cls: SkuConflict, tag: 'SkuConflict', status: 409 },
    { Cls: AccessDenied, tag: 'AccessDenied', status: 403 },
    { Cls: NotAuthenticated, tag: 'NotAuthenticated', status: 401 },
    { Cls: DbFailure, tag: 'DbFailure', status: 500 },
  ])('$tag has _tag and statusCode $status', ({ Cls, tag, status }) => {
    const error = new Cls({ message: 'test' });
    expect(error._tag).toBe(tag);
    expect(error.message).toBe('test');
    expect(error.statusCode).toBe(status);
  });

  describe('isAppError', () => {
    it('returns true for domain errors', () => {
      expect(isAppError(new ProductNotFound({ message: 'x' }))).toBe(true);
    });

    it('returns false for plain objects missing fields', () => {
      expect(isAppError({ _tag: 'Foo', message: 'x' })).toBe(false);
      expect(isAppError(null)).toBe(false);
      expect(isAppError('string')).toBe(false);
    });
  });
});
