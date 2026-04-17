import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsPositive, IsString, MaxLength, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSupplierPaymentAllocationDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  payment_id: number;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  credit_note_id?: number;

  @ApiProperty({ example: 5 })
  @IsInt()
  @IsPositive()
  supplier_id: number;

  @ApiProperty({ example: 'INV-2026-001' })
  @IsString()
  @MaxLength(100)
  document_number: string;

  @ApiProperty({ example: 'invoice' })
  @IsString()
  @MaxLength(50)
  document_type: string;

  @ApiProperty({ example: 350.0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  allocated_amount: number;
}
