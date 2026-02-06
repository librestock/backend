import type { ExecutionContext, Type } from '@nestjs/common';

export interface MockRequest {
  params: { id: string };
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  ip?: string;
  socket: { remoteAddress: string };
  session?: { user?: { id?: string; [key: string]: unknown } } | undefined;
}

export const createExecutionContext = (
  request: MockRequest,
): ExecutionContext => ({
  switchToHttp: () => ({
    getRequest: <T = any>(): T => request as T,
    getResponse: <T = any>(): T => undefined as T,
    getNext: <T = any>(): T => undefined as T,
  }),
  switchToRpc: () => ({
    getContext: <T = any>(): T => undefined as T,
    getData: <T = any>(): T => undefined as T,
  }),
  switchToWs: () => ({
    getClient: <T = any>(): T => undefined as T,
    getData: <T = any>(): T => undefined as T,
    getPattern: <T = any>(): T => undefined as T,
  }),
  getArgs: <T extends any[] = any[]>(): T => [request] as T,
  getArgByIndex: <T = any>(index: number): T =>
    (index === 0 ? request : undefined) as T,
  getHandler: () => () => undefined,
  getClass: <T = any>(): Type<T> => {
    const MockClass = class {};
    return MockClass as Type<T>;
  },
  getType: <TContext extends string = string>(): TContext => 'http' as TContext,
});
