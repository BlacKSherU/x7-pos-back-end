import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SuccessResponse } from '../../../../common/dtos/success-response.dto';
import { OnlineStoreStatus } from '../constants/online-store-status.enum';

export class OnlineStoreResponseDto {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the Online Store',
  })
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Merchant owning the Online Store',
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
    example: 'my-store',
    description: 'Subdomain of the online store',
  })
  subdomain: string;

  @ApiProperty({
    example: true,
    description: 'Whether the online store is active',
  })
  isActive: boolean;

  @ApiProperty({
    example: 'default',
    description: 'Theme of the online store',
  })
  theme: string;

  @ApiProperty({
    example: 'USD',
    description: 'Currency code used in the online store',
  })
  currency: string;

  @ApiProperty({
    example: 'America/New_York',
    description: 'Timezone of the online store',
  })
  timezone: string;

  @ApiProperty({
    example: OnlineStoreStatus.ACTIVE,
    enum: OnlineStoreStatus,
    description: 'Logical status for deletion (active, deleted)',
  })
  status: OnlineStoreStatus;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Creation timestamp of the Online Store record',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Last update timestamp of the Online Store record',
  })
  updatedAt: Date;
}

export class OneOnlineStoreResponseDto extends SuccessResponse {
  @ApiProperty({ type: OnlineStoreResponseDto })
  data: OnlineStoreResponseDto;
}
