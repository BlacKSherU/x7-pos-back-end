import { ReceiptTaxFiltersDto } from './receipt-tax-filters.dto';

/**
 * Filters of GET /receipt-taxes/summary. The status filter does not apply: amounts always
 * come from active taxes (the ones counted in receipt totals) and the counts split
 * active/inactive.
 */
export class GetReceiptTaxesSummaryQueryDto extends ReceiptTaxFiltersDto {}
