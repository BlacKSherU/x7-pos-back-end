import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { FeatureAccessGuard } from 'src/auth/guards/feature-access.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { RequireFeature } from 'src/auth/decorators/require-feature.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { SUBSCRIPTION_FEATURE_IDS } from 'src/common/subscription/subscription-feature-ids';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';

import { BillingFinancialSyncService } from './billing-financial-sync.service';
import {
  GetFinancialSyncLinesQueryDto,
  GetFinancialSyncQueryDto,
} from './dto/get-financial-sync-query.dto';
import {
  AllPaginatedFinancialSyncRows,
  OneFinancialSyncLinesResponse,
} from './dto/financial-sync-response.dto';
import {
  FinancialSyncPostingAccountsResponse,
  OneFinancialSyncMetricsResponse,
  PostBatchToLedgerResponse,
} from './dto/financial-sync-metrics.dto';
import { PostBatchToLedgerDto } from './dto/post-batch-to-ledger.dto';

type AuthenticatedRequest = ExpressRequest & { user?: AuthenticatedUser };

@ApiTags('Core - Billing transactions - Financial ledger sync')
@ApiBearerAuth()
@ApiExtraModels(ErrorResponse)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
@Controller('billing/financial-sync')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.RECEIPTS)
export class BillingFinancialSyncController {
  constructor(private readonly service: BillingFinancialSyncService) {}

  private merchantIdOf(req: AuthenticatedRequest): number {
    const merchantId = req.user?.merchant?.id;
    if (!merchantId) {
      throw new ForbiddenException(
        'User must be associated with a merchant for this operation',
      );
    }
    return merchantId;
  }

  @Get()
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Billing ↔ ledger sync grid',
    description:
      'Paginated active receipts of the merchant with their ReceiptTax records, linked journal entries (reference_type RECEIPT), debit/credit aggregated per ledger account, posting status and balance verification flags computed in integer cents. Filters: posting status, invoice_number search and created_at date range.',
  })
  @ApiOkResponse({
    description: 'Grid rows retrieved',
    type: AllPaginatedFinancialSyncRows,
  })
  @ApiBadRequestResponse({ description: 'Invalid query', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({
    description: 'Merchant not found',
    type: ErrorResponse,
  })
  findAll(
    @Query() query: GetFinancialSyncQueryDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<AllPaginatedFinancialSyncRows> {
    return this.service.findAll(query, this.merchantIdOf(req));
  }

  @Get('metrics')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Ledger posting metrics (header KPIs)',
    description:
      'Posted / pending / unposted receipts, posted revenue (net credit on REVENUE accounts of posted receipt entries), DRAFT entries pending, balances of the LIABILITY tax accounts used by receipt entries and the overall balance status.',
  })
  @ApiOkResponse({
    description: 'Metrics retrieved',
    type: OneFinancialSyncMetricsResponse,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({
    description: 'Merchant not found',
    type: ErrorResponse,
  })
  getMetrics(
    @Request() req: AuthenticatedRequest,
  ): Promise<OneFinancialSyncMetricsResponse> {
    return this.service.getMetrics(this.merchantIdOf(req));
  }

  @Get('posting-accounts')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Ledger accounts available for batch posting',
    description:
      'Active ASSET, REVENUE, LIABILITY and EXPENSE accounts of the company, ordered by code.',
  })
  @ApiOkResponse({
    description: 'Accounts retrieved',
    type: FinancialSyncPostingAccountsResponse,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  getPostingAccounts(
    @Request() req: AuthenticatedRequest,
  ): Promise<FinancialSyncPostingAccountsResponse> {
    return this.service.getPostingAccounts(this.merchantIdOf(req));
  }

  @Post('post-batch')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'POST BATCH TO LEDGER',
    description:
      'In one transaction, generates and posts the sales journal entry of every unposted receipt (Dr ASSET grand_total, Dr discount total_discount, Cr REVENUE subtotal, Cr LIABILITY total_tax) and posts the balanced DRAFT entries of pending receipts. Idempotent: receipts already posted are skipped. Returns the refreshed header metrics.',
  })
  @ApiBody({ type: PostBatchToLedgerDto })
  @ApiCreatedResponse({
    description: 'Batch executed',
    type: PostBatchToLedgerResponse,
  })
  @ApiBadRequestResponse({
    description: 'Invalid body or account of the wrong type',
    type: ErrorResponse,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({
    description: 'Ledger account not found or inactive',
    type: ErrorResponse,
  })
  postBatch(
    @Body() dto: PostBatchToLedgerDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<PostBatchToLedgerResponse> {
    return this.service.postBatch(dto, this.merchantIdOf(req));
  }

  @Get(':receiptId/lines')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Drill down into the journal entry lines of a receipt',
    description:
      'Debit/credit lines (with ledger account id, code, name and type) of the journal entries linked to the receipt, optionally restricted to one entry.',
  })
  @ApiParam({ name: 'receiptId', type: Number })
  @ApiOkResponse({
    description: 'Journal entry lines retrieved',
    type: OneFinancialSyncLinesResponse,
  })
  @ApiBadRequestResponse({ description: 'Invalid id', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({
    description: 'Receipt not found or journal entry not linked to it',
    type: ErrorResponse,
  })
  findLines(
    @Param('receiptId', ParseIntPipe) receiptId: number,
    @Query() query: GetFinancialSyncLinesQueryDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<OneFinancialSyncLinesResponse> {
    return this.service.findLines(receiptId, query, this.merchantIdOf(req));
  }
}
