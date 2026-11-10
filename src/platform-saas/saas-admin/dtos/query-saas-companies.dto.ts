import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { CompanyStatus } from '../../companies/constants/company-status.enum';
import { trimToNull } from '../saas-admin.util';

export class QuerySaasCompaniesDto {
  @ApiPropertyOptional({
    example: 'acme',
    description:
      'Case-insensitive search in commercial name, legal name, tax ID and email',
  })
  @IsOptional()
  @Transform(trimToNull)
  @IsString()
  @MaxLength(100)
  search?: string | null;

  @ApiPropertyOptional({ enum: CompanyStatus })
  @IsOptional()
  @IsEnum(CompanyStatus)
  status?: CompanyStatus;

  @ApiPropertyOptional({
    example: 2,
    description:
      'Subscription plan id: companies whose current subscription is on this plan',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tier?: number;

  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 50, minimum: 1, maximum: 100, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
