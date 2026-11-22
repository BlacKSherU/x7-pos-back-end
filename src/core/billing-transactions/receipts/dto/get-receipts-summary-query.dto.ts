import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

import { ReceiptStatusFilter } from '../constants/receipt-status-filter.enum';

export class GetReceiptsSummaryQueryDto {
  @ApiPropertyOptional({
    enum: ReceiptStatusFilter,
    default: ReceiptStatusFilter.ACTIVE,
    description:
      'is_active filter applied to the totals and the breakdowns (active by default)',
  })
  @IsOptional()
  @IsEnum(ReceiptStatusFilter)
  status?: ReceiptStatusFilter;
}
