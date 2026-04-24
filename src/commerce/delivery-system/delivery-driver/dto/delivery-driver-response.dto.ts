//src/commerce/delivery-system/delivery-driver/dto/delivery-driver-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';

export class DeliveryDriverResponseDto {
  @ApiProperty({ example: 1, description: 'Identifier of the Delivery Driver' })
  id: number;

  @ApiProperty({ example: 1, description: 'Identifier of the Merchant' })
  merchant: Merchant;

  @ApiProperty({
    example: 'Mario Lopez',
    description: 'Name of the Delivery Driver',
  })
  name: string;

  @ApiProperty({
    example: '809-555-1234',
    description: 'Phone number of the Delivery Driver',
  })
  phone: string;

  @ApiProperty({
    example: 'Car',
    description: 'Vehicle type of the Delivery Driver',
  })
  vehicleType: string;

  @ApiProperty({
    example: 'active',
    description: 'Status of the delivery driver',
  })
  status: string;
}

export class OneDeliveryDriverResponseDto extends SuccessResponse {
  @ApiProperty()
  data: DeliveryDriverResponseDto;
}

export class AllDeliveryDriverResponseDto extends SuccessResponse {
  @ApiProperty()
  data: DeliveryDriverResponseDto[];
}
