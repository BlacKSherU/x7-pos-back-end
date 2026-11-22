import {
  Controller,
  ForbiddenException,
  Get,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express';

import { FeatureAccessGuard } from 'src/auth/guards/feature-access.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { RequireFeature } from 'src/auth/decorators/require-feature.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { SUBSCRIPTION_FEATURE_IDS } from 'src/common/subscription/subscription-feature-ids';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';

import { BillingReportsService } from './billing-reports.service';
import {
  BillingReportFormat,
  DiscountAuditQueryDto,
  TaxLiabilityQueryDto,
} from './dto/billing-report-query.dto';
import { TaxLiabilityReportResponseDto } from './dto/tax-liability-report.dto';
import { DiscountAuditReportResponseDto } from './dto/discount-audit-report.dto';
import { csvFileName } from './lib/csv.util';
import { discountAuditCsv, taxLiabilityCsv } from './lib/report-csv';

type AuthenticatedRequest = ExpressRequest & { user?: AuthenticatedUser };

/**
 * Reportes de facturación (Historia 8): pasivo de impuestos y auditoría de descuentos/anulaciones.
 * JSON por defecto; `format=csv` descarga el mismo reporte como archivo CSV.
 */
@ApiTags('Core - Billing transactions - Reports')
@ApiBearerAuth()
@ApiExtraModels(ErrorResponse)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
@Controller('billing/reports')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.RECEIPTS)
export class BillingReportsController {
  constructor(private readonly reportsService: BillingReportsService) {}

  private merchantIdOf(req: AuthenticatedRequest): number {
    const merchantId = req.user?.merchant?.id;
    if (!merchantId) {
      throw new ForbiddenException(
        'User must be associated with a merchant for this operation',
      );
    }
    return merchantId;
  }

  private sendCsv(res: ExpressResponse, fileName: string, csv: string): string {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    return csv;
  }

  @Get('tax-liability')
  @RequireFeature(SUBSCRIPTION_FEATURE_IDS.RECEIPTS_TAXES)
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Tax liability report',
    description:
      'Aggregates active ReceiptTax lines of active receipts of the merchant, grouped by currency, scope, rate and tax name. ' +
      'Taxable subtotal = receipt subtotal (RECEIPT scope) or line item subtotal (ITEM scope), counted once per receipt/item per group. ' +
      'Totals are the exact (cent-based) sum of the groups. Use `format=csv` to download a CSV file.',
  })
  @ApiProduces('application/json', 'text/csv')
  @ApiOkResponse({
    description: 'Tax liability report (JSON) or CSV file',
    type: TaxLiabilityReportResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid filters',
    type: ErrorResponse,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  async taxLiability(
    @Query() query: TaxLiabilityQueryDto,
    @Request() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: ExpressResponse,
  ): Promise<TaxLiabilityReportResponseDto | string> {
    const report = await this.reportsService.getTaxLiability(
      query,
      this.merchantIdOf(req),
    );
    if (query.format === BillingReportFormat.CSV) {
      return this.sendCsv(
        res,
        csvFileName('tax-liability', [query.from, query.to]),
        taxLiabilityCsv(report.data),
      );
    }
    return report;
  }

  @Get('discount-audit')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Discount & void audit trail',
    description:
      'Receipts of the merchant with total_discount > 0 (DISCOUNT) or is_active = false (VOID), with the user and role that processed them, ' +
      'order_snapshot details, original subtotal, discount applied and final total. JSON is paginated (summary covers the whole filter); ' +
      '`format=csv` exports every matching row plus a TOTAL row per currency.',
  })
  @ApiProduces('application/json', 'text/csv')
  @ApiOkResponse({
    description: 'Discount audit report (JSON) or CSV file',
    type: DiscountAuditReportResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid filters',
    type: ErrorResponse,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  async discountAudit(
    @Query() query: DiscountAuditQueryDto,
    @Request() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: ExpressResponse,
  ): Promise<DiscountAuditReportResponseDto | string> {
    const isCsv = query.format === BillingReportFormat.CSV;
    const report = await this.reportsService.getDiscountAudit(
      query,
      this.merchantIdOf(req),
      { paginate: !isCsv },
    );
    if (isCsv) {
      return this.sendCsv(
        res,
        csvFileName('discount-audit', [query.eventType, query.from, query.to]),
        discountAuditCsv(report.data, report.summary),
      );
    }
    return report;
  }
}
