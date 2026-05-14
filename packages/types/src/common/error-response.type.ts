import type { ErrorCode } from './error-code.enum'

export enum ErrorType {
  BAD_REQUEST = 'BadRequest',
  NOT_FOUND = 'NotFound',
}

export interface ErrorResponseDto {
  statusCode: number;
  message: string | string[];
  error: string;
  code?: ErrorCode;
  path: string;
  timestamp: string;
}
