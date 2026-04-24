//src/commerce/delivery-system/delivery-driver/dto/create-delivery-driver.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsInt, IsIn } from 'class-validator';

export class CreateDeliveryDriverDto {
  @ApiProperty({ example: 1, description: 'Identifier of the Merchant' })
  @IsInt()
  @IsNotEmpty()
  merchant: number;

  @ApiProperty({
    example: 'Mario Lopez',
    description: 'Name of the Delivery Driver',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: '809-555-1234',
    description: 'Phone number of the Delivery Driver',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    example: 'Car',
    description: 'Vehicle type of the Delivery Driver',
  })
  @IsString()
  @IsNotEmpty()
  vehicleType: string;

  @ApiProperty({
    example: 'active',
    description: 'Status of the delivery driver',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['active', 'inactive'])
  status: string;
}
