import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @MinLength(2)
  @ApiProperty({ example: 'Phone', description: 'Name of the Category' })
  name: string;

  @IsNumber()
  @ApiProperty({ example: 123, description: 'Category of the Merchant' })
  merchantId: number;

  @IsOptional()
  @IsNumber()
  @ApiProperty({
    example: 123,
    description: 'Parent category ID',
    required: false,
  })
  parentId?: number;
}
