import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SuccessResponse } from '../../../../common/dtos/success-response.dto';
import { KitchenStationType } from '../constants/kitchen-station-type.enum';
import { KitchenDisplayMode } from '../constants/kitchen-display-mode.enum';
import { KitchenStationStatus } from '../constants/kitchen-station-status.enum';

export class KitchenStationResponseDto {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the Kitchen Station',
  })
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Merchant owning the Kitchen Station',
  })
  merchantId: number;

  @ApiProperty({
    description: 'Basic merchant information',
    example: {
      id: 1,
      name: 'Restaurant ABC',
    },
  })
  merchant: {
    id: number;
    name: string;
  };

  @ApiProperty({
    example: 'Hot Station 1',
    description: 'Name of the kitchen station',
  })
  name: string;

  @ApiProperty({
    example: KitchenStationType.HOT,
    enum: KitchenStationType,
    description: 'Type of the kitchen station',
  })
  stationType: KitchenStationType;

  @ApiProperty({
    example: KitchenDisplayMode.AUTO,
    enum: KitchenDisplayMode,
    description: 'Display mode of the kitchen station',
  })
  displayMode: KitchenDisplayMode;

  @ApiProperty({
    example: 1,
    description: 'Display order for sorting',
  })
  displayOrder: number;

  @ApiPropertyOptional({
    example: 'Kitchen Printer 1',
    description: 'Name of the printer associated with this station',
  })
  printerName?: string | null;

  @ApiProperty({
    example: true,
    description: 'Whether the kitchen station is active',
  })
  isActive: boolean;

  @ApiProperty({
    example: KitchenStationStatus.ACTIVE,
    enum: KitchenStationStatus,
    description: 'Logical status for deletion (active, deleted)',
  })
  status: KitchenStationStatus;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Creation timestamp of the Kitchen Station record',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Last update timestamp of the Kitchen Station record',
  })
  updatedAt: Date;
}

export class OneKitchenStationResponseDto extends SuccessResponse {
  @ApiProperty({ type: KitchenStationResponseDto })
  data: KitchenStationResponseDto;
}
