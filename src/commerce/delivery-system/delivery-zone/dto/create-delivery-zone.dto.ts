//src/commerce/delivery-system/delivery-zone/dto/create-delivery-zone.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDeliveryZoneDto {
  @ApiProperty({ example: 1, description: 'Identifier of the Merchant' })
  @IsInt()
  @IsNotEmpty()
  merchant: number;

  @ApiProperty({
    example: 'Centro, Zona Norte',
    description: 'Name of the Delivery Zone',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'description of the delivery zone',
    description: 'Description of the Delivery Zone',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    example:
      '{"type":"Polygon","coordinates":[[[-69.9384,18.4662],[-69.9384,18.4662],[-69.9384,18.4662],[-69.9384,18.4662]]]}',
    description: 'Polygon coordinates defining the delivery zone area',
  })
  @IsOptional()
  geojson: string;

  @ApiProperty({
    example: 'active',
    description: 'Status of the delivery zone',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['active', 'inactive'])
  status: string;
}
