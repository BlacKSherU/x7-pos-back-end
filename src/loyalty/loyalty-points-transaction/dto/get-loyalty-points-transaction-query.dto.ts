import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class GetLoyaltyPointsTransactionQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by minimum current points (greater than or equal to)',
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  min_points?: number;

  @ApiPropertyOptional({
    description: 'Filter by maximum current points (less than or equal to)',
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  max_points?: number;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    type: Number,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page for pagination',
    type: Number,
    default: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 10;
}
