import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Query,
  Request,
  ParseIntPipe,
  Put,
  Patch,
  ForbiddenException,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { FeatureAccessGuard } from 'src/auth/guards/feature-access.guard';
import { RequireFeature } from 'src/auth/decorators/require-feature.decorator';
import { SUBSCRIPTION_FEATURE_IDS } from 'src/common/subscription/subscription-feature-ids';

import { ReceiptsService } from './receipts.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import {
  GetReceiptOrderOptionsQueryDto,
  ReceiptOrderOptionsResponseDto,
} from './dto/receipt-order-options.dto';
import { UpdateReceiptDto } from './dto/update-receipt.dto';
import { UpdateReceiptStatusDto } from './dto/update-receipt-status.dto';
import { ReceiptStatusFilter } from './constants/receipt-status-filter.enum';
import {
  GetReceiptsQueryDto,
  ReceiptSortBy,
} from './dto/get-receipts-query.dto';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthenticatedUser } from '../../../auth/interfaces/authenticated-user.interface';
import { OneReceiptResponseDto } from './dto/receipt-response.dto';
import { AllPaginatedReceipts } from './dto/all-paginated-receipts.dto';
import { GetReceiptsSummaryQueryDto } from './dto/get-receipts-summary-query.dto';
import { ReceiptSummaryResponseDto } from './dto/receipt-summary-response.dto';
import { ReceiptDetailsResponseDto } from './dto/receipt-details-response.dto';
import { ReceiptTaxBreakdownResponseDto } from './dto/receipt-tax-breakdown-response.dto';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { FiscalLock } from './fiscal-lock/fiscal-lock.decorator';
import { FiscalLockSource } from './fiscal-lock/fiscal-lock.constants';
import { FISCAL_LOCK_MESSAGE } from './utils/fiscal-lock.util';
import { ReceiptActor, receiptActorOf } from './audit/receipt-audit.util';
import { ReceiptActivityLogResponseDto } from './audit/dto/receipt-activity-log-response.dto';

@ApiTags('Core - Billing transactions - Receipts')
@ApiBearerAuth()
@ApiExtraModels(ErrorResponse)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
@Controller('receipts')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.RECEIPTS)
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  /**
   * Obtains the merchant ID of the authenticated user.
   *
   * Passport hangs the user from `req.user`. Reading it as `req.merchant?.id` by typing the request as AuthenticatedUser, which passed the error in front of the compiler, always returned undefined and the service responded 403 to all calls.
   */
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

  /** Usuario y rol que ejecutan la operación (bloqueo fiscal / auditoría). */
  private actorOf(
    req: ExpressRequest & { user?: AuthenticatedUser },
  ): ReceiptActor {
    const user = req.user;
    if (!user?.id) {
      throw new ForbiddenException('An authenticated user is required');
    }
    return { id: user.id, role: user.role };
  }

  @Post()
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Create a new receipt' })
  @ApiBody({ type: CreateReceiptDto })
  @ApiCreatedResponse({
    description: 'Receipt created',
    type: OneReceiptResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid data', type: ErrorResponse })
  @ApiConflictResponse({
    description:
      'Receipt already exists for this order and type, or the invoice number is already used by another receipt of the merchant',
    type: ErrorResponse,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Order not found', type: ErrorResponse })
  async create(
    @Body() dto: CreateReceiptDto,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<OneReceiptResponseDto> {
    const authenticatedUserMerchantId = this.merchantIdOf(req);
    return this.receiptsService.create(
      dto,
      authenticatedUserMerchantId,
      receiptActorOf(req.user),
    );
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
    summary: 'Get all receipts',
    description:
      'Paginated receipts of the merchant. `search` matches invoice_number or fiscal_data (case-insensitive, partial). `status` filters by is_active (active by default). `dateFrom` / `dateTo` (YYYY-MM-DD, inclusive) filter by creation date.',
  })
  @ApiQuery({ name: 'orderId', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: Object.values(ReceiptStatusFilter),
  })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: Object.values(ReceiptSortBy),
  })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiOkResponse({
    description: 'Receipts retrieved',
    type: AllPaginatedReceipts,
  })
  @ApiBadRequestResponse({ description: 'Invalid query', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  async findAll(
    @Query() query: GetReceiptsQueryDto,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<AllPaginatedReceipts> {
    const authenticatedUserMerchantId = this.merchantIdOf(req);
    return this.receiptsService.findAll(query, authenticatedUserMerchantId);
  }

  // Rutas estáticas antes de ':id' (si no, ParseIntPipe recibiría 'summary', 'tax-breakdown' u
  // 'order-options').
  @Get('order-options')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Orders of the merchant that can be billed',
    description:
      'Feeds the searchable order selector of NEW RECEIPT. Active orders of the merchant, newest first (up to `limit`, 20 by default, 50 max). With `type`, orders that already have an active receipt of that type are left out. `search` matches the order number or customer name (partial) or the exact order ID. Also returns the base currency of the merchant company as the default currency.',
  })
  @ApiOkResponse({
    description: 'Order options retrieved',
    type: ReceiptOrderOptionsResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid query', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  async findOrderOptions(
    @Query() query: GetReceiptOrderOptionsQueryDto,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<ReceiptOrderOptionsResponseDto> {
    return this.receiptsService.findOrderOptions(query, this.merchantIdOf(req));
  }

  @Get('summary')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Receipts KPIs (Command Hub Header)',
    description:
      'Active / inactive / locked receipt counts and sums of grand_total, subtotal, taxes and discounts of the merchant, filtered by is_active (`status`, active by default) and creation date (`dateFrom` / `dateTo`, inclusive), with breakdowns by type and currency.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: Object.values(ReceiptStatusFilter),
  })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiOkResponse({
    description: 'Receipts summary retrieved',
    type: ReceiptSummaryResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid query', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  async getSummary(
    @Query() query: GetReceiptsSummaryQueryDto,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<ReceiptSummaryResponseDto> {
    const authenticatedUserMerchantId = this.merchantIdOf(req);
    return this.receiptsService.getSummary(query, authenticatedUserMerchantId);
  }

  @Get('tax-breakdown')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Tax collected per tax type (Tax Breakdown cards)',
    description:
      'Sum of the active tax lines of the merchant receipts grouped by tax name, rate and currency, filtered by is_active (`status`, active by default) and creation date (`dateFrom` / `dateTo`, inclusive).',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: Object.values(ReceiptStatusFilter),
  })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiOkResponse({
    description: 'Tax breakdown retrieved',
    type: ReceiptTaxBreakdownResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid query', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  async getTaxBreakdown(
    @Query() query: GetReceiptsSummaryQueryDto,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<ReceiptTaxBreakdownResponseDto> {
    const authenticatedUserMerchantId = this.merchantIdOf(req);
    return this.receiptsService.getTaxBreakdown(
      query,
      authenticatedUserMerchantId,
    );
  }

  @Get(':id')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Get a receipt by id' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Receipt retrieved',
    type: OneReceiptResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid id', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Not found', type: ErrorResponse })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<OneReceiptResponseDto> {
    const authenticatedUserMerchantId = this.merchantIdOf(req);
    return this.receiptsService.findOne(id, authenticatedUserMerchantId);
  }

  @Get(':id/details')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Receipt line items and tax lines (master-detail row)',
    description:
      'Active items (name, quantity, unit_price, total) and tax lines (name, rate, amount) of a receipt of the merchant, active or logically deleted.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Receipt details retrieved',
    type: ReceiptDetailsResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid id', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Not found', type: ErrorResponse })
  async getDetails(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<ReceiptDetailsResponseDto> {
    const authenticatedUserMerchantId = this.merchantIdOf(req);
    return this.receiptsService.getDetails(id, authenticatedUserMerchantId);
  }

  @Get(':id/activity-log')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Receipt activity log / audit trail (Historia 6)',
    description:
      'Every lifecycle event of a receipt of the merchant (CREATED, UPDATED, LOCKED, TAX_MODIFIED, ITEM_MODIFIED, DEACTIVATED, MODIFICATION_BLOCKED, ADJUSTMENT_ISSUED) in exact chronological order (created_at, id), with the user id, role, user name, timestamp and the subtotal / total_tax / total_discount / grand_total before and after each event.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Receipt activity log retrieved',
    type: ReceiptActivityLogResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid id', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Not found', type: ErrorResponse })
  async getActivityLog(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<ReceiptActivityLogResponseDto> {
    const authenticatedUserMerchantId = this.merchantIdOf(req);
    return this.receiptsService.getActivityLog(id, authenticatedUserMerchantId);
  }

  @Put(':id')
  @FiscalLock(FiscalLockSource.RECEIPT_PARAM)
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Update a receipt' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateReceiptDto })
  @ApiOkResponse({
    description: 'Receipt updated',
    type: OneReceiptResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid data', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Not found', type: ErrorResponse })
  @ApiConflictResponse({
    description:
      'Invoice number already used by another receipt of the merchant',
    type: ErrorResponse,
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReceiptDto,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<OneReceiptResponseDto> {
    const authenticatedUserMerchantId = this.merchantIdOf(req);
    return this.receiptsService.update(
      id,
      dto,
      authenticatedUserMerchantId,
      receiptActorOf(req.user),
    );
  }

  @Patch(':id')
  @FiscalLock(FiscalLockSource.RECEIPT_PARAM)
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Partially update a receipt',
    description: 'Same contract as PUT: only the fields sent are changed.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateReceiptDto })
  @ApiOkResponse({
    description: 'Receipt updated',
    type: OneReceiptResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid data', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Not found', type: ErrorResponse })
  @ApiConflictResponse({
    description:
      'Invoice number already used by another receipt of the merchant',
    type: ErrorResponse,
  })
  async patch(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReceiptDto,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<OneReceiptResponseDto> {
    const authenticatedUserMerchantId = this.merchantIdOf(req);
    return this.receiptsService.update(
      id,
      dto,
      authenticatedUserMerchantId,
      receiptActorOf(req.user),
    );
  }

  @Patch(':id/status')
  @FiscalLock(FiscalLockSource.RECEIPT_PARAM)
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Change receipt status (logical delete)',
    description: `isActive=false performs a logical deletion (the financial history is kept). Fiscal lock (Historia 11): inactive or locked receipts are immutable, so reactivating a logically deleted receipt or deactivating a locked one returns 403 "${FISCAL_LOCK_MESSAGE}".`,
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateReceiptStatusDto })
  @ApiOkResponse({
    description: 'Receipt status updated',
    type: OneReceiptResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid data', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Not found', type: ErrorResponse })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReceiptStatusDto,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<OneReceiptResponseDto> {
    const authenticatedUserMerchantId = this.merchantIdOf(req);
    return this.receiptsService.updateStatus(
      id,
      dto,
      authenticatedUserMerchantId,
      receiptActorOf(req.user),
    );
  }

  @Patch(':id/lock')
  @FiscalLock(FiscalLockSource.RECEIPT_PARAM)
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Fiscally lock a receipt (Historia 11)',
    description: `Sets is_locked = true and records processed_by_user_id / processed_by_role of the authenticated user (updated_at is refreshed). From then on the receipt, its items and its taxes are immutable: corrections go through credit / debit notes. Only active, unlocked receipts can be locked; otherwise 403 "${FISCAL_LOCK_MESSAGE}".`,
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Receipt locked',
    type: OneReceiptResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid id', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Not found', type: ErrorResponse })
  async lock(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<OneReceiptResponseDto> {
    const authenticatedUserMerchantId = this.merchantIdOf(req);
    return this.receiptsService.lock(
      id,
      this.actorOf(req),
      authenticatedUserMerchantId,
    );
  }

  @Delete(':id')
  @FiscalLock(FiscalLockSource.RECEIPT_PARAM)
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Delete a receipt (logical)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Receipt deleted',
    type: OneReceiptResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid id', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Not found', type: ErrorResponse })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<OneReceiptResponseDto> {
    const authenticatedUserMerchantId = this.merchantIdOf(req);
    return this.receiptsService.remove(
      id,
      authenticatedUserMerchantId,
      receiptActorOf(req.user),
    );
  }
}
