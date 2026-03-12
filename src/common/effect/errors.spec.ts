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
  class ProductNotFoundWithId extends NotFoundError(
    'ProductNotFoundWithId',
  )<{ readonly id: string }> {}
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

  it('allows subclasses to add typed payload fields without redefining message', () => {
    const error = new ProductNotFoundWithId({
      id: 'product-1',
      message: 'Product not found',
    });

    expect(error.id).toBe('product-1');
    expect(error.message).toBe('Product not found');
    expect(error.statusCode).toBe(404);
  });

  describe('isAppError', () => {
    it('returns true for domain errors', () => {
      expect(isAppError(new ProductNotFound({ message: 'x' }))).toBe(true);
    });

    it('returns false for plain objects missing fields', () => {
      expect(isAppError({ _tag: 'Foo', message: 'x' })).toBe(false);
      expect(isAppError({ _tag: 123, message: 'x', statusCode: 400 })).toBe(
        false,
      );
      expect(isAppError({ _tag: 'Foo', message: 123, statusCode: 400 })).toBe(
        false,
      );
      expect(isAppError(null)).toBe(false);
      expect(isAppError('string')).toBe(false);
    });
  });
});
