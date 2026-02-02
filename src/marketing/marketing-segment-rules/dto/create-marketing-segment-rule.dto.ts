import { IsNotEmpty, IsString, IsEnum, MaxLength, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MarketingSegmentRuleOperator } from '../constants/marketing-segment-rule-operator.enum';

export class CreateMarketingSegmentRuleDto {
  @ApiProperty({
    example: 1,
    description: 'Identifier of the Marketing Segment this rule belongs to',
  })
  @IsNotEmpty({ message: 'Segment ID is required' })
  @IsNumber({}, { message: 'Segment ID must be a number' })
  @Min(1, { message: 'Segment ID must be greater than 0' })
  segmentId: number;

  @ApiProperty({
    example: 'total_spent',
    description: 'Field name to evaluate (e.g., total_spent, last_order_days, city, tier)',
    examples: ['total_spent', 'last_order_days', 'city', 'tier', 'order_count'],
  })
  @IsNotEmpty({ message: 'Field is required' })
  @IsString({ message: 'Field must be a string' })
  @MaxLength(255, { message: 'Field cannot exceed 255 characters' })
  field: string;

  @ApiProperty({
    example: MarketingSegmentRuleOperator.GREATER_THAN,
    enum: MarketingSegmentRuleOperator,
    description: 'Operator to use for comparison',
  })
  @IsNotEmpty({ message: 'Operator is required' })
  @IsEnum(MarketingSegmentRuleOperator, {
    message: 'Operator must be a valid operator (=, >, <, >=, <=, IN, LIKE, etc.)',
  })
  operator: MarketingSegmentRuleOperator;

  @ApiProperty({
    example: '1000',
    description: 'Value to compare against',
  })
  @IsNotEmpty({ message: 'Value is required' })
  @IsString({ message: 'Value must be a string' })
  @MaxLength(255, { message: 'Value cannot exceed 255 characters' })
  value: string;
}
