import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  IsNumber,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateOnlineMenuDto {
  @ApiProperty({
    example: 1,
    description: 'Identifier of the Online Store owning the Menu',
  })
  @IsNumber({}, { message: 'Store ID must be a number' })
  @IsNotEmpty({ message: 'Store ID is required' })
  storeId: number;

  @ApiProperty({ example: 'Main Menu', description: 'Name of the online menu' })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @MinLength(1, { message: 'Name must be at least 1 character' })
  @MaxLength(100, { message: 'Name cannot exceed 100 characters' })
  name: string;

  @ApiPropertyOptional({
    example: 'This is the main menu for our restaurant',
    description: 'Description of the online menu',
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;
}
