//src/commerce/delivery-system/delivery-fee/dto/delivery-fee-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { DeliveryZone } from '../../delivery-zone/entity/delivery-zone.entity';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';

export class DeliveryFeeResponseDto {
  @ApiProperty({ example: 1, description: 'Identifier of the Delivery Fee' })
  id: number;

  @ApiProperty({
    type: () => DeliveryZone,
    example: 1,
    description: 'Identifier of the Delivery Zone related',
  })
  deliveryZone: DeliveryZone;

  @ApiProperty({
    example: 5.99,
    description: 'Fee amount for the delivery zone',
  })
  base_fee: number;

  @ApiProperty({
    example: 1.5,
    description: 'Fee per kilometer for the delivery zone',
  })
  per_km_fee: number;

  @ApiProperty({
    example: 10.99,
    description: 'Minimun Order Amount for the delivery fee to apply',
  })
  min_order_amount: number;

  @ApiProperty({
    example: 10.99,
    description: 'Free above order amount for the delivery fee to apply',
  })
  free_above: number;

  @ApiProperty({
    example: 'active',
    description: 'Status of the delivery zone',
  })
  status: string;
}

export class OneDeliveryFeeResponseDto extends SuccessResponse {
  @ApiProperty()
  data: DeliveryFeeResponseDto;
}

export class AllDeliveryFeeResponseDto extends SuccessResponse {
  @ApiProperty()
  data: DeliveryFeeResponseDto[];
}
