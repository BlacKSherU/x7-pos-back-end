//src/subscriptions/plan-applications/dto/summary-plan-applications.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { PlanApplication } from '../entity/plan-applications.entity';

export class PlanApplicationSummaryDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ example: { id: 1, name: 'Application' } })
  application: { id: number; name: string };

  @ApiProperty({ example: { id: 1, name: 'Subscription Plan' } })
  subscriptionPlan: { id: number; name: string };

  @ApiProperty({ example: 'Basic usage limit: 100 users per month' })
  limits: string;
}

export class OnePlanApplicationResponseDto extends SuccessResponse {
  @ApiProperty()
  data: PlanApplication;
}

export class AllPlanApplicationsResponseDto extends SuccessResponse {
  @ApiProperty()
  data: PlanApplication[];
}
