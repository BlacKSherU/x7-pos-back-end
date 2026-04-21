import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateReceiptTaxDto {
  @ApiProperty({
    example: 'IVA 19%',
    description: 'Tax name or label',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(150)
  name?: string;

  @ApiProperty({
    example: 19,
    description: 'Tax rate as a percentage',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  rate?: number;

  @ApiProperty({
    example: 4.28,
    description: 'Calculated tax amount',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  amount?: number;
}
