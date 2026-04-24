import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from '../../../../common/dtos/success-response.dto';
import { OnlineMenuCategoryStatus } from '../constants/online-menu-category-status.enum';

export class BasicCategoryInfoDto {
  @ApiProperty({ example: 1, description: 'Category ID' })
  id: number;

  @ApiProperty({ example: 'Beverages', description: 'Category name' })
  name: string;
}

export class BasicOnlineMenuInfoDto {
  @ApiProperty({ example: 1, description: 'Online Menu ID' })
  id: number;

  @ApiProperty({ example: 'Main Menu', description: 'Online Menu name' })
  name: string;
}

export class OnlineMenuCategoryResponseDto {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the Online Menu Category',
  })
  id: number;

  @ApiProperty({ example: 1, description: 'Identifier of the Online Menu' })
  menuId: number;

  @ApiProperty({ example: 1, description: 'Identifier of the Category' })
  categoryId: number;

  @ApiProperty({
    example: 1,
    description: 'Display order of the category in the menu',
  })
  displayOrder: number;

  @ApiProperty({
    example: OnlineMenuCategoryStatus.ACTIVE,
    enum: OnlineMenuCategoryStatus,
    description: 'Logical status for deletion (active, deleted)',
  })
  status: OnlineMenuCategoryStatus;

  @ApiProperty({
    example: '2024-01-15T08:00:00Z',
    description: 'Creation timestamp',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2024-01-15T09:00:00Z',
    description: 'Last update timestamp',
  })
  updatedAt: Date;

  @ApiProperty({
    type: () => BasicOnlineMenuInfoDto,
    description: 'Online Menu information',
  })
  menu: BasicOnlineMenuInfoDto;

  @ApiProperty({
    type: () => BasicCategoryInfoDto,
    description: 'Category information',
  })
  category: BasicCategoryInfoDto;
}

export class OneOnlineMenuCategoryResponseDto extends SuccessResponse {
  @ApiProperty({
    type: () => OnlineMenuCategoryResponseDto,
    description: 'Online menu category data',
  })
  data: OnlineMenuCategoryResponseDto;
}
