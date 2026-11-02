import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/** Every field is optional: only what is sent changes. Dates are YYYY-MM-DD. */
export class UpdateCompanySubscriptionDto {
  @ApiPropertyOptional({ example: 2, description: 'New subscription plan' })
  @IsOptional()
  @IsInt()
  @Min(1)
  planId?: number;

  @ApiPropertyOptional({ enum: ['active', 'inactive'] })
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;

  @ApiPropertyOptional({ example: '2026-11-01' })
  @IsOptional()
  @IsDateString({ strict: true })
  startDate?: string;

  @ApiPropertyOptional({ example: '2027-11-01', nullable: true })
  @IsOptional()
  @IsDateString({ strict: true })
  endDate?: string | null;

  @ApiPropertyOptional({ example: '2027-11-01', nullable: true })
  @IsOptional()
  @IsDateString({ strict: true })
  renewalDate?: string | null;

  @ApiPropertyOptional({ example: 'credit_card' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  paymentMethod?: string;
}
