import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SuccessResponse } from '../../../../common/dtos/success-response.dto';
import { OrderItemStatus } from '../constants/order-item-status.enum';

export class OrderItemResponseDto {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Order Item' })
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Order associated with this item',
  })
  orderId: number;

  @ApiProperty({
    description: 'Basic order information',
    example: {
      id: 1,
      businessStatus: 'pending',
      type: 'dine_in',
    },
  })
  order: {
    id: number;
    businessStatus: string;
    type: string;
  };

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Product associated with this item',
  })
  productId: number;

  @ApiProperty({
    description: 'Basic product information',
    example: {
      id: 1,
      name: 'Coca-Cola',
      sku: '123456',
      basePrice: 10.99,
    },
  })
  product: {
    id: number;
    name: string;
    sku: string;
    basePrice: number;
  };

  @ApiPropertyOptional({
    example: 1,
    description: 'Identifier of the Variant associated with this item',
  })
  variantId?: number | null;

  @ApiPropertyOptional({
    description: 'Basic variant information',
    example: {
      id: 1,
      name: 'Large',
      price: 12.99,
      sku: '123456-L',
    },
  })
  variant?: {
    id: number;
    name: string;
    price: number;
    sku: string;
  } | null;

  @ApiProperty({
    example: 2,
    description: 'Quantity of the item',
  })
  quantity: number;

  @ApiProperty({
    example: 125.50,
    description: 'Price of the item',
  })
  price: number;

  @ApiProperty({
    example: 10.00,
    description: 'Discount applied to the item',
  })
  discount: number;

  @ApiProperty({
    example: 241.0,
    description: 'Total price for the line (qty * price - discount)',
  })
  totalPrice: number;

  @ApiPropertyOptional({
    example: 'Extra sauce on the side',
    description: 'Notes about the item',
  })
  notes?: string | null;

  @ApiProperty({
    example: OrderItemStatus.ACTIVE,
    enum: OrderItemStatus,
    description: 'Logical status for deletion (active, deleted)',
  })
  status: OrderItemStatus;

  @ApiProperty({
    example: 'pending',
    description:
      'Kitchen workflow status for this line (pending, in_preparation, ready, served)',
  })
  kitchenStatus: string;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Creation timestamp of the Order Item record',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Last update timestamp of the Order Item record',
  })
  updatedAt: Date;
}

export class OneOrderItemResponseDto extends SuccessResponse {
  @ApiProperty({ type: OrderItemResponseDto })
  data: OrderItemResponseDto;
}





