//src/commerce/delivery-system/delivery-tracking/dto/delivery-tracking-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { DeliveryAssignment } from '../../delivery-assignment/entity/delivery-assignment.entity';

export class DeliveryTrackingResponseDto {
  @ApiProperty({
    example: 1,
    description: 'Identifier of the Delivery Assignment',
  })
  id: number;

  @ApiProperty({ example: 1, description: 'Identifier of the Order' })
  deliveryAssignment: DeliveryAssignment;

  @ApiProperty({
    example: 37.7749,
    description: 'Current latitude of the delivery driver',
  })
  latitude: number;

  @ApiProperty({
    example: -122.4194,
    description: 'Current longitude of the delivery driver',
  })
  longitude: number;

  @ApiProperty({
    example: '2024-06-01T12:00:00Z',
    description: 'Time when the location was recorded',
  })
  recorded_at: Date;

  @ApiProperty({
    example: 'active',
    description: 'Status of the delivery tracking',
  })
  status: string;
}

export class OneDeliveryTrackingResponseDto extends SuccessResponse {
  @ApiProperty()
  data: DeliveryTrackingResponseDto;
}

export class AllDeliveryTrackingResponseDto extends SuccessResponse {
  @ApiProperty()
  data: DeliveryTrackingResponseDto[];
}
