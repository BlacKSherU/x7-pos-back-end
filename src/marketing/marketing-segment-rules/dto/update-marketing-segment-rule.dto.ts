import { PartialType } from '@nestjs/swagger';
import { CreateMarketingSegmentRuleDto } from './create-marketing-segment-rule.dto';
import { IsOptional, IsString, IsEnum, MaxLength, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MarketingSegmentRuleOperator } from '../constants/marketing-segment-rule-operator.enum';

export class UpdateMarketingSegmentRuleDto extends PartialType(CreateMarketingSegmentRuleDto) {
  @ApiPropertyOptional({
    example: 1,
    description: 'Identifier of the Marketing Segment this rule belongs to',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Segment ID must be a number' })
  @Min(1, { message: 'Segment ID must be greater than 0' })
  segmentId?: number;

  @ApiPropertyOptional({
    example: 'total_spent',
    description: 'Field name to evaluate',
  })
  @IsOptional()
  @IsString({ message: 'Field must be a string' })
  @MaxLength(255, { message: 'Field cannot exceed 255 characters' })
  field?: string;

  @ApiPropertyOptional({
    example: MarketingSegmentRuleOperator.GREATER_THAN,
    enum: MarketingSegmentRuleOperator,
    description: 'Operator to use for comparison',
  })
  @IsOptional()
  @IsEnum(MarketingSegmentRuleOperator, {
    message: 'Operator must be a valid operator',
  })
  operator?: MarketingSegmentRuleOperator;

  @ApiPropertyOptional({
    example: '1000',
    description: 'Value to compare against',
  })
  @IsOptional()
  @IsString({ message: 'Value must be a string' })
  @MaxLength(255, { message: 'Value cannot exceed 255 characters' })
  value?: string;
}
