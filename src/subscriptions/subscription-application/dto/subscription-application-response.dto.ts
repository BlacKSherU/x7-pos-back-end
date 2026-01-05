// src/subscriptions/subscription-application/dto/subscription-application-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { SubscriptionApplication } from '../entity/subscription-application.entity';

export class SubscriptionApplicationResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  status: string;

  @ApiProperty({
    example: {
      id: 1,
      merchant: { id: 5, name: 'Merchant A' },
      subscriptionPlan: { id: 3, name: 'Plan Gold' },
    },
  })
  merchantSubscription: {
    id: number;
    merchant: any;
    plan: any;
  };

  @ApiProperty({
    example: { id: 10, name: 'Application X' },
  })
  application: {
    id: number;
    name: string;
    status: string;
  };
}

export class OneSubscriptionApplicationResponseDto extends SuccessResponse {
  @ApiProperty()
  data: SubscriptionApplication;
}

export class AllSubscriptionApplicationsResponseDto extends SuccessResponse {
  @ApiProperty()
  data: SubscriptionApplication[];
}
