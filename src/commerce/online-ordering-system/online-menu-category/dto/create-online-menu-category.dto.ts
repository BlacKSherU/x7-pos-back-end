import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsNotEmpty,
  Min,
  IsInt,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { OnlineMenuCategoryStatus } from '../constants/online-menu-category-status.enum';

export class CreateOnlineMenuCategoryDto {
  @ApiProperty({ example: 1, description: 'Identifier of the Online Menu' })
  @IsNumber({}, { message: 'Menu ID must be a number' })
  @IsNotEmpty({ message: 'Menu ID is required' })
  menuId: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Category from product inventory',
  })
  @IsNumber({}, { message: 'Category ID must be a number' })
  @IsNotEmpty({ message: 'Category ID is required' })
  categoryId: number;

  @ApiProperty({
    example: 1,
    description: 'Display order of the category in the menu',
  })
  @IsInt({ message: 'Display order must be an integer' })
  @IsNotEmpty({ message: 'Display order is required' })
  @Min(0, { message: 'Display order must be greater than or equal to 0' })
  displayOrder: number;

  @ApiPropertyOptional({
    example: OnlineMenuCategoryStatus.ACTIVE,
    enum: OnlineMenuCategoryStatus,
    description: 'Logical status for creation (active, deleted)',
  })
  @IsOptional()
  @IsEnum(OnlineMenuCategoryStatus, {
    message: 'Status must be active or deleted',
  })
  status?: OnlineMenuCategoryStatus;
}
