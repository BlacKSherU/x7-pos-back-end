import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { ReceiptTaxScope } from '../../receipt-tax/constants/receipt-tax-scope.enum';

export class TaxLiabilityFiltersDto {
  @ApiPropertyOptional({ example: '2026-01-01', nullable: true })
  from: string | null;

  @ApiPropertyOptional({ example: '2026-01-31', nullable: true })
  to: string | null;

  @ApiPropertyOptional({ example: 19, nullable: true })
  rate: number | null;

  @ApiPropertyOptional({ enum: ReceiptTaxScope, nullable: true })
  scope: ReceiptTaxScope | null;

  @ApiPropertyOptional({ example: 'VAT', nullable: true })
  name: string | null;

  @ApiPropertyOptional({ example: 'USD', nullable: true })
  currency: string | null;
}

export class TaxLiabilityGroupDto {
  @ApiProperty({ example: 'VAT 19%' })
  name: string;

  @ApiProperty({ enum: ReceiptTaxScope })
  scope: ReceiptTaxScope;

  @ApiProperty({ example: 19 })
  rate: number;

  @ApiProperty({ example: 'USD' })
  currency: string;

  @ApiProperty({
    example: 1250.5,
    description:
      'Taxable base: receipt subtotal (RECEIPT scope) or line item subtotal (ITEM scope), counted once per receipt/item in the group.',
  })
  taxable_subtotal: number;

  @ApiProperty({ example: 237.6, description: 'Sum of the tax line amounts.' })
  tax_collected: number;

  @ApiProperty({ example: 42, description: 'Number of ReceiptTax lines.' })
  tax_lines: number;

  @ApiProperty({ example: 40, description: 'Distinct receipts in the group.' })
  receipts: number;

  @ApiProperty({
    example: 0,
    description:
      'ITEM-scope lines whose line item no longer exists (they add tax but no taxable base).',
  })
  lines_without_base: number;
}

export class TaxLiabilityScopeTotalsDto {
  @ApiProperty({ enum: ReceiptTaxScope })
  scope: ReceiptTaxScope;

  @ApiProperty({ example: 1250.5 })
  taxable_subtotal: number;

  @ApiProperty({ example: 237.6 })
  tax_collected: number;

  @ApiProperty({ example: 42 })
  tax_lines: number;
}

export class TaxLiabilityTotalsDto {
  @ApiProperty({ example: 2500.75, description: 'Sum of the group bases.' })
  taxable_subtotal: number;

  @ApiProperty({ example: 475.14, description: 'Sum of the group taxes.' })
  tax_collected: number;

  @ApiProperty({ example: 84, description: 'Sum of the group tax lines.' })
  tax_lines: number;

  @ApiProperty({ example: 60, description: 'Distinct receipts (not summed).' })
  receipts: number;

  @ApiProperty({ example: 3 })
  groups: number;
}

export class TaxLiabilityCurrencyTotalsDto extends TaxLiabilityTotalsDto {
  @ApiProperty({ example: 'USD' })
  currency: string;

  @ApiProperty({ type: () => [TaxLiabilityScopeTotalsDto] })
  by_scope: TaxLiabilityScopeTotalsDto[];
}

export class TaxLiabilityReportDto {
  @ApiProperty({ type: () => TaxLiabilityFiltersDto })
  filters: TaxLiabilityFiltersDto;

  @ApiProperty({ example: '2026-02-01T10:00:00.000Z' })
  generated_at: string;

  @ApiProperty({
    example: ['USD'],
    type: [String],
    description: 'Currencies present in the report.',
  })
  currencies: string[];

  @ApiProperty({ type: () => [TaxLiabilityGroupDto] })
  groups: TaxLiabilityGroupDto[];

  @ApiProperty({
    type: () => TaxLiabilityTotalsDto,
    description:
      'Grand totals = sum of all groups. Only meaningful as money when `currencies` has a single entry; otherwise use `totals_by_currency`.',
  })
  totals: TaxLiabilityTotalsDto;

  @ApiProperty({ type: () => [TaxLiabilityCurrencyTotalsDto] })
  totals_by_currency: TaxLiabilityCurrencyTotalsDto[];
}

export class TaxLiabilityReportResponseDto extends SuccessResponse {
  @ApiProperty({ type: () => TaxLiabilityReportDto })
  data: TaxLiabilityReportDto;
}
