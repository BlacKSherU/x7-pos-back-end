import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

import { ReceiptStatusFilter } from '../constants/receipt-status-filter.enum';
import { ReceiptDateRangeQueryDto } from './receipt-date-range-query.dto';

/** status + rango de fechas: lo usan el resumen (KPIs) y el desglose de impuestos. */
export class GetReceiptsSummaryQueryDto extends ReceiptDateRangeQueryDto {
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
