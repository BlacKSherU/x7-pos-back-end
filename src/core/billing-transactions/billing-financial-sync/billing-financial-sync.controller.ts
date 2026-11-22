import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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
