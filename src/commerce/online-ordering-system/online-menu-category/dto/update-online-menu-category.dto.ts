import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';

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
  @IsNumber({}, { message: 'Display order must be a number' })
  @Min(0, { message: 'Display order must be greater than or equal to 0' })
  displayOrder?: number;
}
