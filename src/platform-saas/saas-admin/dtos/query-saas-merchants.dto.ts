import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { MerchantStatus } from '../../merchants/constants/merchant-status.enum';
import { trimToNull } from '../saas-admin.util';

export class QuerySaasMerchantsDto {
  @ApiPropertyOptional({
    example: 'downtown',
    description:
      'Case-insensitive search in branch name, branch code (MCH-0007) and email',
  })
  @IsOptional()
  @Transform(trimToNull)
  @IsString()
  @MaxLength(100)
  search?: string | null;

  @ApiPropertyOptional({
    example: 'Miami',
    description: 'Exact city, case-insensitive',
  })
  @IsOptional()
  @Transform(trimToNull)
  @IsString()
  @MaxLength(80)
  city?: string | null;

  @ApiPropertyOptional({ enum: MerchantStatus })
  @IsOptional()
  @IsEnum(MerchantStatus)
  status?: MerchantStatus;
}
