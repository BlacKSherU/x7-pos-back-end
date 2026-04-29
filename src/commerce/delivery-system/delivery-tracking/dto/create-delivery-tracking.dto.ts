//src/commerce/delivery-system/delivery-tracking/dto/create-delivery-tracking.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsIn,
  IsNumber,
  IsDate,
} from 'class-validator';

export class CreateDeliveryTrackingDto {
  @ApiProperty({
    example: 1,
    description: 'Identifier of the Delivery Assignment',
  })
  @IsInt()
  @IsNotEmpty()
  deliveryAssignment: number;

  @ApiProperty({
    example: 37.7749,
    description: 'Current latitude of the delivery driver',
  })
  @IsNotEmpty()
  @IsNumber()
  latitude: number;

  @ApiProperty({
    example: -122.4194,
    description: 'Current longitude of the delivery driver',
  })
  @IsNotEmpty()
  @IsNumber()
  longitude: number;

  @ApiProperty({
    example: '2024-06-01T12:00:00Z',
    description: 'Time when the location was recorded',
  })
  @IsDate()
  @IsNotEmpty()
  recorded_at: Date;

  @ApiProperty({
    example: 'active',
    description: 'Status of the delivery driver',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['active', 'inactive'])
  status: string;
}
