import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { ReceiptTaxScope } from '../../receipt-tax/constants/receipt-tax-scope.enum';
import { ReceiptType } from '../../receipts/constants/receipt-type.enum';

export enum BillingReportFormat {
  JSON = 'json',
  CSV = 'csv',
}

/** Filtros comunes: rango de fechas del recibo (`created_at`) y formato de salida. */
export class BillingReportBaseQueryDto {
  @ApiPropertyOptional({
    example: '2026-01-01',
    description:
      'Receipts created on or after this date (ISO 8601, receipt `created_at`).',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    example: '2026-01-31',
    description:
      'Receipts created up to this date. A date without time includes the whole day.',
  })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    enum: BillingReportFormat,
    default: BillingReportFormat.JSON,
    description: '`csv` downloads the report as a CSV file (text/csv).',
  })
  @IsOptional()
  @IsEnum(BillingReportFormat)
  format?: BillingReportFormat;

  @ApiPropertyOptional({
    example: 'USD',
    description: 'Only receipts in this currency (ISO 4217).',
  })
  @IsOptional()
  @IsString()
  @Length(3, 10)
  currency?: string;
}

export class TaxLiabilityQueryDto extends BillingReportBaseQueryDto {
  @ApiPropertyOptional({ example: 19, description: 'Exact tax rate (%).' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999.99)
  rate?: number;

  @ApiPropertyOptional({
    enum: ReceiptTaxScope,
    description: 'Tax scope: whole receipt or a single line item.',
  })
  @IsOptional()
  @IsEnum(ReceiptTaxScope)
  scope?: ReceiptTaxScope;

  @ApiPropertyOptional({
    example: 'VAT',
    description: 'Tax name / type (case-insensitive partial match).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;
}

export enum DiscountAuditEventType {
  ALL = 'all',
  DISCOUNT = 'discount',
  VOID = 'void',
}

export class DiscountAuditQueryDto extends BillingReportBaseQueryDto {
  @ApiPropertyOptional({
    enum: DiscountAuditEventType,
    default: DiscountAuditEventType.ALL,
    description:
      '`discount`: total_discount > 0 · `void`: is_active = false · `all`: either.',
  })
  @IsOptional()
  @IsEnum(DiscountAuditEventType)
  eventType?: DiscountAuditEventType;

  @ApiPropertyOptional({
    example: 7,
    description: 'Only receipts processed by this user (processed_by_user_id).',
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  userId?: number;

  @ApiPropertyOptional({ enum: ReceiptType })
  @IsOptional()
  @IsEnum(ReceiptType)
  receiptType?: ReceiptType;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    example: 50,
    default: 50,
    description: 'Rows per page (1-500). Ignored by the CSV export.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}
