// src/companies/dtos/update-Merchant.dto.ts
import { IsNumber, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SuccessResponse } from '../../common/dtos/success-response.dto';
import { Merchant } from '../entities/merchant.entity';

export class MerchantResponseDto {
  @IsNumber()
  @ApiProperty({ example: 1, description: 'Merchant ID' })
  id: number;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @ApiPropertyOptional({
    example: 'Acme Corp',
    description: 'Name of the Merchant',
  })
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @ApiPropertyOptional({
    example: 'contact@acme.com',
    description: 'Contact email of the Merchant',
  })
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @ApiPropertyOptional({
    example: '123 Main St',
    description: 'Address of the Merchant',
  })
  address?: string;
}

export class MerchantLittleResponseDto {
  @IsNumber()
  @ApiProperty({ example: 1, description: 'Merchant ID' })
  id: number;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @ApiPropertyOptional({
    example: 'Acme Corp',
    description: 'Name of the Merchant',
  })
  name?: string;
}

export class OneMerchantResponseDto extends SuccessResponse {
  @ApiProperty()
  data: Merchant;
}

export class AllMerchantsResponseDto extends SuccessResponse {
  @ApiProperty()
  data: Merchant[];
}
