// src/subscriptions/plan-features/dto/plan-feature-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { PlanFeature } from '../entity/plan-features.entity';

export class PlanFeatureResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ example: { id: 1, name: 'SubscriptionPlan' } })
  subscriptionPlan: { id: number; name: string };

  @ApiProperty({ example: { id: 1, name: 'Feature' } })
  feature: { id: number; name: string };

  @ApiProperty({ example: 10990 })
  limit_value: number;

  @ApiProperty({ example: 'active' })
  status: string;
}

export class OnePlanFeatureResponseDto extends SuccessResponse {
  @ApiProperty()
  data: PlanFeature;
}

export class AllPlanFeatureResponseDto extends SuccessResponse {
  @ApiProperty()
  data: PlanFeature[];
}
