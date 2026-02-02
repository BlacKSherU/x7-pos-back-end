import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, MaxLength } from 'class-validator';
import { MarketingSegmentType } from '../constants/marketing-segment-type.enum';

export class CreateMarketingSegmentDto {
  @ApiProperty({
    example: 'VIP Customers',
    description: 'Name of the marketing segment',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    example: MarketingSegmentType.AUTOMATIC,
    enum: MarketingSegmentType,
    description: 'Type of the marketing segment (automatic, manual)',
  })
  @IsEnum(MarketingSegmentType)
  @IsNotEmpty()
  type: MarketingSegmentType;
}
