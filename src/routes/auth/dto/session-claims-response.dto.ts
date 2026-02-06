import { ApiProperty } from '@nestjs/swagger';
import type { SessionClaimsResponseDto as SessionClaimsResponseDtoShape } from '@librestock/types';

export class SessionClaimsResponseDto implements SessionClaimsResponseDtoShape {
  @ApiProperty()
  user_id: string;

  @ApiProperty()
  session_id: string;

  @ApiProperty({ format: 'int64' })
  expires_at: number;

  @ApiProperty({ format: 'int64' })
  issued_at: number;
}
