//src/commerce/delivery-system/delivery-driver/dto/create-delivery-driver.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsIn,
  IsEnum,
  IsDate,
} from 'class-validator';
import { DeliveryStatus } from '../../constants/delivery-status.enum';

export class CreateDeliveryAssignmentDto {
  @ApiProperty({ example: 1, description: 'Identifier of the Order' })
  @IsInt()
  @IsNotEmpty()
  order: number;

  @ApiProperty({ example: 1, description: 'Identifier of the Delivery Driver' })
  @IsInt()
  @IsNotEmpty()
  deliveryDriver: number;

  @ApiProperty({
    example: DeliveryStatus,
    enum: DeliveryStatus,
    description: 'Status of the Delivery',
  })
  @IsEnum(DeliveryStatus)
  @IsNotEmpty()
  delivery_status: DeliveryStatus;

  @ApiProperty({
    example: '2024-06-01T12:00:00Z',
    description: 'Scheduled delivery time assignment',
  })
  @IsDate()
  @IsNotEmpty()
  assigned_at: Date;

  @ApiProperty({
    example: '2024-06-01T12:15:00Z',
    description: 'Actual pickup time',
  })
  @IsDate()
  @IsNotEmpty()
  picked_up_at: Date;

  @ApiProperty({
    example: '2024-06-01T12:30:00Z',
    description: 'Actual delivery time',
  })
  @IsDate()
  @IsNotEmpty()
  delivered_at: Date;

  @ApiProperty({
    example: 'active',
    description: 'Status of the delivery driver',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['active', 'inactive'])
  status: string;
}
