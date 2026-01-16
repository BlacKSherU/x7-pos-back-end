import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { PurchaseOrderStatus } from '../constants/purchase-order-status.enum';

export class CreatePurchaseOrderDto {
  @ApiProperty({
    example: 1,
    description: 'ID of the supplier for this purchase order',
  })
  @IsNotEmpty()
  @IsNumber()
  supplierId: number;

  @ApiProperty({
    example: PurchaseOrderStatus.PENDING,
    description: 'Status of the purchase order',
    enum: PurchaseOrderStatus,
    default: PurchaseOrderStatus.PENDING,
  })
  @IsNotEmpty()
  @IsEnum(PurchaseOrderStatus)
  status?: PurchaseOrderStatus;

  @ApiProperty({
    example: 100.5,
    description: 'Total amount of the purchase order',
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  totalAmount?: number;
}
