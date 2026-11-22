import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  RECEIPT_ITEM_MAX_AMOUNT,
  RECEIPT_ITEM_MAX_QUANTITY,
} from '../receipt-item-calculation';

/**
 * Edición de una línea. El recibo (receiptId) no se puede cambiar: mover una línea
 * de recibo exigiría recalcular dos cabeceras; se da de baja y se crea en el otro.
 * subtotal y total no se aceptan: los calcula siempre el servidor.
 */
export class UpdateReceiptItemDto {
  @ApiProperty({ example: 'Burger Combo XL', required: false })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiProperty({
    example: 'SKU-002',
    required: false,
    nullable: true,
    description: 'Send null or an empty string to clear the SKU',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  sku?: string | null;

  @ApiProperty({ example: 3, required: false })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0.01)
  @Max(RECEIPT_ITEM_MAX_QUANTITY)
  quantity?: number;

  @ApiProperty({ example: 12.5, required: false })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  @Max(RECEIPT_ITEM_MAX_AMOUNT)
  unitPrice?: number;

  @ApiProperty({ example: 1.5, required: false })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  @Max(RECEIPT_ITEM_MAX_AMOUNT)
  discountAmount?: number;

  @ApiProperty({
    example: '{"notes":"Sin cebolla"}',
    description: 'Arbitrary metadata in JSON format',
    required: false,
  })
  @IsString()
  @IsOptional()
  metadata?: string;

  @ApiProperty({
    example: true,
    required: false,
    description:
      'Logical status. false = logical deletion, true = restore a previously deleted line. Both recalculate the receipt totals.',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
