import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateSupplierDto {
  @ApiProperty({ example: 'Coca-Cola', description: 'Supplier name' })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: '12345678-9',
    description: 'Tax ID (e.g. Chilean RUT format: 12345678-9)',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  @Matches(/^[0-9]{7,8}-[0-9kK]$/, {
    message: 'tax_id must be a valid RUT format (e.g. 12345678-9)',
  })
  tax_id?: string;

  @ApiProperty({
    example: 'supplier@example.com',
    description: 'Email',
    required: false,
  })
  @IsEmail()
  @IsOptional()
  @MaxLength(150)
  email?: string;

  @ApiProperty({
    example: '+123456789',
    description: 'Phone number',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @ApiProperty({
    example: '123 Main St',
    description: 'Address',
    required: false,
  })
  @IsString()
  @IsOptional()
  address?: string;
}
