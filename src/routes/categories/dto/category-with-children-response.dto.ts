import { ApiProperty } from '@nestjs/swagger';
import type { CategoryWithChildrenResponseDto as CategoryWithChildrenResponseDtoShape } from '@librestock/types';
import { BaseResponseDto } from '../../../common/dto/base-response.dto';

export class CategoryWithChildrenResponseDto
  extends BaseResponseDto
  implements CategoryWithChildrenResponseDtoShape
{
  @ApiProperty({
    description: 'Unique identifier',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Category name',
    example: 'Electronics',
  })
  name: string;

  @ApiProperty({
    description: 'Parent category ID',
    format: 'uuid',
    nullable: true,
  })
  parent_id: string | null;

  @ApiProperty({
    description: 'Category description',
    nullable: true,
    example: 'Electronic equipment and components',
  })
  description: string | null;

  @ApiProperty({
    description: 'Child categories',
    type: () => [CategoryWithChildrenResponseDto],
  })
  children: CategoryWithChildrenResponseDto[];
}
