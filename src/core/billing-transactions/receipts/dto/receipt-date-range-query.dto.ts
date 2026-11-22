import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, Matches } from 'class-validator';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Rango de fechas (YYYY-MM-DD, ambos extremos inclusive) sobre `created_at` del recibo.
 * Lo comparten el listado, los KPIs y el desglose de impuestos para que sigan el mismo filtro.
 */
export class ReceiptDateRangeQueryDto {
  @ApiPropertyOptional({
    example: '2026-11-01',
    description: 'Receipts created on or after this date (YYYY-MM-DD)',
  })
  @IsOptional()
  @Matches(DATE_ONLY, { message: 'dateFrom must use the YYYY-MM-DD format' })
  @IsDateString(
    { strict: true },
    { message: 'dateFrom must be a valid calendar date' },
  )
  dateFrom?: string;

  @ApiPropertyOptional({
    example: '2026-11-30',
    description: 'Receipts created on or before this date (YYYY-MM-DD)',
  })
  @IsOptional()
  @Matches(DATE_ONLY, { message: 'dateTo must use the YYYY-MM-DD format' })
  @IsDateString(
    { strict: true },
    { message: 'dateTo must be a valid calendar date' },
  )
  dateTo?: string;
}
