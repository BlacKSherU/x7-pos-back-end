import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { trimToNull } from '../saas-admin.util';

export enum SaasTerminalStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export class QuerySaasMerchantTerminalsDto {
  @ApiPropertyOptional({
    example: 'bolt',
    description:
      'Case-insensitive search in the terminal name, model and device identifier',
  })
  @IsOptional()
  @Transform(trimToNull)
  @IsString()
  @MaxLength(100)
  search?: string | null;

  @ApiPropertyOptional({
    enum: SaasTerminalStatus,
    description: 'Terminal status; all terminals when omitted',
  })
  @IsOptional()
  @IsEnum(SaasTerminalStatus)
  status?: SaasTerminalStatus;
}
