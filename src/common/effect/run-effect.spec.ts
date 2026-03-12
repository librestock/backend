import { Effect } from 'effect';
import { HttpException } from '@nestjs/common';
import { runEffect } from './run-effect';
import { NotFoundError, BadRequestError, InternalError } from './errors';

class TestNotFound extends NotFoundError('TestNotFound') {}
class TestBadRequest extends BadRequestError('TestBadRequest') {}
class TestInternal extends InternalError('TestInternal') {}

describe('runEffect', () => {
  it('resolves with the success value', async () => {
    const effect = Effect.succeed('hello');
    await expect(runEffect(effect)).resolves.toBe('hello');
  });

  it('maps a 404 domain error to HttpException with status 404', async () => {
    const effect = Effect.fail(
      new TestNotFound({ message: 'Product not found' }),
    );
    await expect(runEffect(effect)).rejects.toThrow(HttpException);
    await expect(runEffect(effect)).rejects.toMatchObject({
      status: 404,
    });
  });

  it('maps a 400 domain error to HttpException with status 400', async () => {
    const effect = Effect.fail(
      new TestBadRequest({ message: 'Invalid input' }),
    );
    await expect(runEffect(effect)).rejects.toThrow(HttpException);
    await expect(runEffect(effect)).rejects.toMatchObject({
      status: 400,
    });
  });

  it('maps a 500 domain error to HttpException with status 500', async () => {
    const effect = Effect.fail(
      new TestInternal({ message: 'DB failure' }),
    );
    await expect(runEffect(effect)).rejects.toThrow(HttpException);
    await expect(runEffect(effect)).rejects.toMatchObject({
      status: 500,
    });
  });

  it('passes through existing HttpExceptions', async () => {
    const httpEx = new HttpException('Forbidden', 403);
    const effect = Effect.die(httpEx);
    await expect(runEffect(effect)).rejects.toThrow(HttpException);
    await expect(runEffect(effect)).rejects.toMatchObject({
      status: 403,
    });
  });
});
