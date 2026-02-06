import { ApiProperty } from '@nestjs/swagger';
import type { MessageResponseDto as MessageResponseDtoShape } from '@librestock/types';

export class MessageResponseDto implements MessageResponseDtoShape {
  @ApiProperty({ example: 'Operation completed successfully' })
  message: string;
}
