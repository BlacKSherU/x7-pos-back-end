import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsNotEmpty,
  IsPositive,
  IsOptional,
  IsString,
  Min,
  IsEnum,
} from 'class-validator';
import { OrderItemKitchenStatus } from '../constants/order-item-kitchen-status.enum';

export class CreateOrderItemDto {
  @ApiProperty({
    example: 1,
    description: 'Identifier of the Order associated with this item',
  })
  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  orderId: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Product associated with this item',
  })
  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  productId: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Identifier of the Variant associated with this item',
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  variantId?: number;

  @ApiProperty({
    example: 2,
    description: 'Quantity of the item',
  })
  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  quantity: number;

  @ApiPropertyOptional({
    example: 125.5,
    description:
      'Unit price for this line. If omitted, it is taken from the variant (if variantId is set) or the product base price, like online order items.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({
    example: 10.0,
    description: 'Discount applied to the item',
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional({
    example: OrderItemKitchenStatus.PENDING,
    enum: OrderItemKitchenStatus,
    description: 'Kitchen status for this line',
  })
  @IsOptional()
  @IsEnum(OrderItemKitchenStatus)
  kitchenStatus?: OrderItemKitchenStatus;

  @ApiPropertyOptional({
    example: 'Extra sauce on the side',
    description: 'Notes about the item',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
