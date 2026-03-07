import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ErrorCode, ErrorType, type ErrorResponseDto as ErrorResponseDtoShape } from '@librestock/types/common'

export { ErrorType };

export class ErrorResponseDto implements ErrorResponseDtoShape {
  @ApiProperty({ example: 404 })
  statusCode: number;

  @ApiProperty({ example: 'Resource not found' })
  message: string | string[];

  @ApiProperty({ example: 'Resource not found' })
  error: string;

  @ApiPropertyOptional({
    enum: ErrorCode,
    example: ErrorCode.NOT_FOUND,
  })
  code?: ErrorCode;

  @ApiProperty({ example: '/api/v1/products/123' })
  path: string;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  timestamp: string;
}
