import { IsNotEmpty, IsNumber, IsEnum, IsOptional, IsDateString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { TipPoolDistributionType } from '../constants/tip-pool-distribution-type.enum';
import { TipPoolStatus } from '../constants/tip-pool-status.enum';

export class CreateTipPoolDto {
  @ApiProperty({ example: 1, description: 'Company ID' })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  companyId: number;

  @ApiProperty({ example: 1, description: 'Merchant ID' })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  merchantId: number;

  @ApiProperty({ example: 1, description: 'Shift ID' })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  shiftId: number;

  @ApiProperty({ example: 'Morning Shift Pool', description: 'Name of the tip pool' })
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: TipPoolDistributionType.EQUAL,
    enum: TipPoolDistributionType,
    description: 'Distribution type',
  })
  @IsNotEmpty()
  @IsEnum(TipPoolDistributionType)
  distributionType: TipPoolDistributionType;

  @ApiPropertyOptional({ example: 0, description: 'Total amount (default 0)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  @ApiProperty({
    example: TipPoolStatus.OPEN,
    enum: TipPoolStatus,
    description: 'Pool status',
  })
  @IsNotEmpty()
  @IsEnum(TipPoolStatus)
  status: TipPoolStatus;

  @ApiPropertyOptional({ example: '2024-01-15T18:00:00Z', description: 'When the pool was closed' })
  @IsOptional()
  @IsDateString()
  closedAt?: string | null;
}
