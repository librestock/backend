import { ApiProperty } from '@nestjs/swagger';
import { ErrorType, type ErrorResponseDto as ErrorResponseDtoShape } from '@librestock/types';

export { ErrorType };

export class ErrorResponseDto implements ErrorResponseDtoShape {
  @ApiProperty({ example: 'Resource not found' })
  error: string;
}
