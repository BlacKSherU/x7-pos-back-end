//src/commerce/delivery-system/delivery-fee/dto/create-delivery-fee.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsIn, IsNotEmpty, IsString } from 'class-validator';

export class CreateDeliveryFeeDto {
  @ApiProperty({
    example: 1,
    description: 'Identifier of the Delivery Zone related',
  })
  @IsNotEmpty()
  deliveryZone: number;

  @ApiProperty({
    example: 10.99,
    description: 'Delivery fee amount',
  })
  @IsNotEmpty()
  @IsNumber()
  base_fee: number;

  @ApiProperty({
    example: 1.5,
    description: 'Fee per kilometer for the delivery zone',
  })
  @IsNotEmpty()
  @IsNumber()
  per_km_fee: number;

  @ApiProperty({
    example: 10.99,
    description: 'Minimun Order Amount for the delivery fee to apply',
  })
  @IsNotEmpty()
  @IsNumber()
  min_order_amount: number;

  @ApiProperty({
    example: 10.99,
    description: 'Free above order amount for the delivery fee to apply',
  })
  @IsNotEmpty()
  @IsNumber()
  free_above: number;

  @ApiProperty({
    example: 'active',
    description: 'Status of the delivery fee',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['active', 'inactive'])
  status: string;
}
