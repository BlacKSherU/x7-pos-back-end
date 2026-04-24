//src/commerce/delivery-system/delivery-zone/dto/delivery-zone-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';

export class DeliveryZoneResponseDto {
  @ApiProperty({ example: 1, description: 'Identifier of the Delivery Zone' })
  id: number;

  @ApiProperty({ example: 1, description: 'Identifier of the Merchant' })
  merchant: Merchant;

  @ApiProperty({
    example: 'Centro, Zona Norte',
    description: 'Name of the Delivery Zone',
  })
  name: string;

  @ApiProperty({
    example: 'description of the delivery zone',
    description: 'Description of the Delivery Zone',
  })
  description: string;

  @ApiProperty({
    example:
      '{"type":"Polygon","coordinates":[[[-69.9384,18.4662],[-69.9384,18.4662],[-69.9384,18.4662],[-69.9384,18.4662]]]}',
    description: 'Polygon coordinates defining the delivery zone area',
  })
  geojson: string;

  @ApiProperty({
    example: 'active',
    description: 'Status of the delivery zone',
  })
  status: string;
}

export class OneDeliveryZoneResponseDto extends SuccessResponse {
  @ApiProperty()
  data: DeliveryZoneResponseDto;
}

export class AllDeliveryZoneResponseDto extends SuccessResponse {
  @ApiProperty()
  data: DeliveryZoneResponseDto[];
}
