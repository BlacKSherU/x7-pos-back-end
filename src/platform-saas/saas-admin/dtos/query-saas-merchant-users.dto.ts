import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { trimToNull } from '../saas-admin.util';

export enum SaasUserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export class QuerySaasMerchantUsersDto {
  @ApiPropertyOptional({
    example: 'john',
    description: 'Case-insensitive search in username and email',
  })
  @IsOptional()
  @Transform(trimToNull)
  @IsString()
  @MaxLength(100)
  search?: string | null;

  @ApiPropertyOptional({
    enum: SaasUserStatus,
    description: 'Account status; all users when omitted',
  })
  @IsOptional()
  @IsEnum(SaasUserStatus)
  status?: SaasUserStatus;
}
