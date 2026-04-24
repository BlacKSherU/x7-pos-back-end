import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsString,
  IsNumber,
  IsOptional,
  IsPositive,
  Min,
} from 'class-validator';

export class CreateSupplierInvoiceItemDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  invoice_id: number;

  @ApiPropertyOptional({ example: 12 })
  @IsInt()
  @IsPositive()
  @IsOptional()
  product_id?: number;

  @ApiProperty({ example: 'Flour 25kg bag' })
  @IsString()
  description: string;

  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  quantity: number;

  @ApiProperty({ example: 50.0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unit_price: number;

  @ApiProperty({ example: 500.0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  line_subtotal: number;

  @ApiProperty({ example: 95.0, default: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  tax_amount: number;

  @ApiProperty({ example: 595.0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  line_total: number;
}
