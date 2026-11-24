import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { ReceiptType } from '../constants/receipt-type.enum';

export const RECEIPT_ORDER_OPTIONS_DEFAULT_LIMIT = 20;
export const RECEIPT_ORDER_OPTIONS_MAX_LIMIT = 50;

/** Query del selector de órdenes del formulario NEW RECEIPT. */
export class GetReceiptOrderOptionsQueryDto {
  @ApiPropertyOptional({
    example: '0009',
    description:
      'Matches the order number or the customer name (case-insensitive, partial), or the exact order ID',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  search?: string;

  @ApiPropertyOptional({
    enum: ReceiptType,
    description:
      'Receipt type to issue: orders that already have an active receipt of this type are left out',
  })
  @IsOptional()
  @IsEnum(ReceiptType)
  type?: ReceiptType;

  @ApiPropertyOptional({
    example: 138,
    description:
      'Order always included when it belongs to the merchant (the current order of a receipt being edited)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  includeOrderId?: number;

  @ApiPropertyOptional({
    example: RECEIPT_ORDER_OPTIONS_DEFAULT_LIMIT,
    minimum: 1,
    maximum: RECEIPT_ORDER_OPTIONS_MAX_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(RECEIPT_ORDER_OPTIONS_MAX_LIMIT)
  limit?: number;
}

/** Orden del merchant que se puede facturar. */
export class ReceiptOrderOptionDto {
  @ApiProperty({ example: 138 })
  id: number;

  @ApiProperty({ example: '0009' })
  order_number: string;

  @ApiProperty({ example: 'paid', description: 'Business status of the order' })
  status: string;

  @ApiProperty({ example: 'take_out' })
  order_type: string;

  @ApiProperty({ example: 34510 })
  total: number;

  @ApiProperty({ example: true })
  is_paid: boolean;

  @ApiProperty({ example: '2026-11-24T09:50:05.721Z' })
  created_at: Date;

  @ApiProperty({ example: 'Cliente Mesón', nullable: true })
  customer_name: string | null;

  @ApiProperty({
    enum: ReceiptType,
    isArray: true,
    example: [ReceiptType.RECEIPT],
    description: 'Types of the active receipts already issued for the order',
  })
  issued_types: ReceiptType[];
}

export class ReceiptOrderOptionsDto {
  @ApiProperty({
    example: 'CLP',
    nullable: true,
    description:
      'Base currency of the merchant company (default currency of a new receipt)',
  })
  default_currency: string | null;

  @ApiProperty({ type: [ReceiptOrderOptionDto] })
  orders: ReceiptOrderOptionDto[];
}

export class ReceiptOrderOptionsResponseDto extends SuccessResponse {
  @ApiProperty({ type: ReceiptOrderOptionsDto })
  data: ReceiptOrderOptionsDto;
}
