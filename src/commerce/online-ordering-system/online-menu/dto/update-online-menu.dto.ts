import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateOnlineMenuDto {
  @ApiPropertyOptional({
    example: 'Main Menu Updated',
    description: 'Name of the online menu',
  })
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  @MinLength(1, { message: 'Name must be at least 1 character' })
  @MaxLength(100, { message: 'Name cannot exceed 100 characters' })
  name?: string;

  @ApiPropertyOptional({
    example: 'Updated description',
    description: 'Description of the online menu',
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether the menu is active',
  })
  @IsOptional()
  @IsBoolean({ message: 'Is active must be a boolean value' })
  isActive?: boolean;
}
