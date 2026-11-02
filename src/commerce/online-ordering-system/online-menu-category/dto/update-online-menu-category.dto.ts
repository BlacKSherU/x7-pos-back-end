import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, Min, IsInt } from 'class-validator';
import { OnlineMenuCategoryStatus } from '../constants/online-menu-category-status.enum';

export class UpdateOnlineMenuCategoryDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Identifier of the Online Menu',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Menu ID must be a number' })
  menuId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Identifier of the Category from product inventory',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Category ID must be a number' })
  categoryId?: number;

  @ApiPropertyOptional({
    example: 2,
    description: 'Display order of the category in the menu',
  })
  @IsOptional()
  @IsInt({ message: 'Display order must be an integer' })
  @Min(0, { message: 'Display order must be greater than or equal to 0' })
  displayOrder?: number;

  @ApiPropertyOptional({
    example: OnlineMenuCategoryStatus.ACTIVE,
    enum: OnlineMenuCategoryStatus,
    description: 'Logical status for deletion (active, deleted)',
  })
  @IsOptional()
  @IsEnum(OnlineMenuCategoryStatus, {
    message: 'Status must be active or deleted',
  })
  status?: OnlineMenuCategoryStatus;
}
