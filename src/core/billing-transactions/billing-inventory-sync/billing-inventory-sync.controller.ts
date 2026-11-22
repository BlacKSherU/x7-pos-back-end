import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Post,
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
import { BillingInventorySyncService } from './billing-inventory-sync.service';
import { GetInventorySyncQueryDto } from './dto/get-inventory-sync-query.dto';
import { AllPaginatedInventorySyncRows } from './dto/inventory-sync-row.dto';
import {
  GetInventorySyncMetricsQueryDto,
  OneInventorySyncMetricsResponse,
} from './dto/inventory-sync-metrics.dto';
import {
  OneStockAvailabilityResponse,
  ValidateStockAvailabilityDto,
} from './dto/validate-stock-availability.dto';

@ApiTags('Core - Billing transactions - Inventory sync')
@ApiBearerAuth()
@ApiExtraModels(ErrorResponse)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
@Controller('billing/inventory-sync')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.RECEIPT_ITEMS)
export class BillingInventorySyncController {
  constructor(private readonly service: BillingInventorySyncService) {}

  /** Merchant del usuario autenticado (Passport lo cuelga de `req.user`). */
  private merchantIdOf(
    req: ExpressRequest & { user?: AuthenticatedUser },
  ): number {
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
    summary: 'Receipt line items mapped to their warehouse stock deductions',
    description:
      'Paginated grid of the merchant receipt lines (ReceiptItem) with the SKU mapped to its product or variant, quantity sold, warehouse location, the OUT_FOR_SALE stock movements of the receipt order and the deduction status (DEDUCTED, PENDING, INSUFFICIENT_STOCK, FAILED, NOT_TRACKED), flagging insufficient stock and failed inventory commits.',
  })
  @ApiOkResponse({
    description: 'Inventory sync rows retrieved',
    type: AllPaginatedInventorySyncRows,
  })
  @ApiBadRequestResponse({ description: 'Invalid query', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  async findAll(
    @Query() query: GetInventorySyncQueryDto,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<AllPaginatedInventorySyncRows> {
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
    summary: 'Inventory & billing stock sync KPIs',
    description:
      'Header metrics for a date window (default: the last 7 days): receipt lines whose stock was deducted, counts per deduction status, and low stock warnings triggered by recent sales (stock items with OUT_FOR_SALE movements in the window whose current quantity is now below the minimum or out of stock), with their active inventory stock alerts. Status counts scan the 2000 most recent receipt lines of the window.',
  })
  @ApiOkResponse({
    description: 'Inventory sync metrics retrieved',
    type: OneInventorySyncMetricsResponse,
  })
  @ApiBadRequestResponse({ description: 'Invalid query', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  async getMetrics(
    @Query() query: GetInventorySyncMetricsQueryDto,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<OneInventorySyncMetricsResponse> {
    return this.service.getMetrics(query, this.merchantIdOf(req));
  }

  @Post('validate-stock')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Validate stock availability (pre-billing check)',
    description:
      'Checks whether the stock location (default: the merchant sales location) has enough stock for a receipt (by receiptId or exact invoiceNumber) or for a list of SKUs and quantities. Recipe components are aggregated per stock item across lines. Read-only: nothing is reserved or deducted.',
  })
  @ApiOkResponse({
    description: 'Availability per line and component',
    type: OneStockAvailabilityResponse,
  })
  @ApiBadRequestResponse({
    description:
      'Invalid body or not exactly one of receiptId, invoiceNumber, items',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Receipt or location not found',
    type: ErrorResponse,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  async validateStock(
    @Body() dto: ValidateStockAvailabilityDto,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<OneStockAvailabilityResponse> {
    return this.service.validateStock(dto, this.merchantIdOf(req));
  }
}
