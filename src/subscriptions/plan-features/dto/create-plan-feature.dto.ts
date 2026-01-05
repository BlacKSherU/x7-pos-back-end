// src/subscriptions/plan-features/dto/create-plan-features.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsIn } from 'class-validator';

export class CreatePlanFeatureDto {
  @ApiProperty({
    example: 1,
    description:
      'Unique identifier of the Subscription Plan to be linked in this Plan Feature',
  })
  @IsNumber()
  @IsNotEmpty()
  subscriptionPlan: number;

  @ApiProperty({
    example: 1,
    description:
      'Unique identifier of the Feature to be linked in this Plan Feature',
  })
  @IsNumber()
  @IsNotEmpty()
  feature: number;

  @ApiProperty({
    example: 10990,
    description: 'This is the limit value of the plan feature',
  })
  @IsNotEmpty()
  @IsNumber()
  limit_value: number;

  @ApiProperty({ example: 'active', enum: ['active', 'inactive'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['active', 'inactive'])
  status: string;
}
