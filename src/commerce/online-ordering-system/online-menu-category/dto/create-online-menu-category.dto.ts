import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty, Min } from 'class-validator';

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
  @IsNumber({}, { message: 'Display order must be a number' })
  @IsNotEmpty({ message: 'Display order is required' })
  @Min(0, { message: 'Display order must be greater than or equal to 0' })
  displayOrder: number;
}
