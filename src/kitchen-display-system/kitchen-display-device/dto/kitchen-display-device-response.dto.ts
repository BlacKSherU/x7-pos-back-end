import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from '../../../common/dtos/success-response.dto';
import { KitchenDisplayDeviceStatus } from '../constants/kitchen-display-device-status.enum';

export class BasicMerchantInfoDto {
  @ApiProperty({ example: 1, description: 'Merchant ID' })
  id: number;

  @ApiProperty({ example: 'Test Merchant', description: 'Merchant name' })
  name: string;
}

export class BasicKitchenStationInfoDto {
  @ApiProperty({ example: 1, description: 'Kitchen Station ID' })
  id: number;

  @ApiProperty({ example: 'Hot Station 1', description: 'Kitchen Station name' })
  name: string;
}

export class KitchenDisplayDeviceResponseDto {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Kitchen Display Device' })
  id: number;

  @ApiProperty({ example: 1, description: 'Identifier of the Merchant' })
  merchantId: number;

  @ApiProperty({ example: 1, description: 'Identifier of the Kitchen Station', nullable: true })
  stationId: number | null;

  @ApiProperty({ example: 'Kitchen Display 1', description: 'Name of the device' })
  name: string;

  @ApiProperty({ example: 'DEV-001', description: 'Unique identifier for the device' })
  deviceIdentifier: string;

  @ApiProperty({ example: '192.168.1.100', description: 'IP address of the device', nullable: true })
  ipAddress: string | null;

  @ApiProperty({ example: true, description: 'Whether the device is currently online' })
  isOnline: boolean;

  @ApiProperty({ example: '2024-01-15T08:30:00Z', description: 'Last synchronization timestamp', nullable: true })
  lastSync: Date | null;

  @ApiProperty({
    example: KitchenDisplayDeviceStatus.ACTIVE,
    enum: KitchenDisplayDeviceStatus,
    description: 'Logical status for deletion (active, deleted)',
  })
  status: KitchenDisplayDeviceStatus;

  @ApiProperty({ example: '2024-01-15T08:00:00Z', description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T09:00:00Z', description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiProperty({ type: () => BasicMerchantInfoDto, description: 'Merchant information' })
  merchant: BasicMerchantInfoDto;

  @ApiProperty({ type: () => BasicKitchenStationInfoDto, description: 'Kitchen Station information', nullable: true })
  station: BasicKitchenStationInfoDto | null;
}

export class OneKitchenDisplayDeviceResponseDto extends SuccessResponse {
  @ApiProperty({ type: () => KitchenDisplayDeviceResponseDto, description: 'Kitchen display device data' })
  data: KitchenDisplayDeviceResponseDto;
}







