import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Request,
  ParseIntPipe,
  ForbiddenException,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { FeatureAccessGuard } from 'src/auth/guards/feature-access.guard';
import { RequireFeature } from 'src/auth/decorators/require-feature.decorator';
import { SUBSCRIPTION_FEATURE_IDS } from 'src/common/subscription/subscription-feature-ids';

import { ReceiptTaxService } from './receipt-tax.service';
import { CreateReceiptTaxDto } from './dto/create-receipt-tax.dto';
import { UpdateReceiptTaxDto } from './dto/update-receipt-tax.dto';
import { UpdateReceiptTaxStatusDto } from './dto/update-receipt-tax-status.dto';
import {
  GetReceiptTaxesQueryDto,
  ReceiptTaxSortBy,
} from './dto/get-receipt-taxes-query.dto';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiBody,
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
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { OneReceiptTaxResponseDto } from './dto/receipt-tax-response.dto';
import { AllPaginatedReceiptTaxes } from './dto/all-paginated-receipt-taxes.dto';
import { GetReceiptTaxesSummaryQueryDto } from './dto/get-receipt-taxes-summary-query.dto';
import { ReceiptTaxesSummaryResponseDto } from './dto/receipt-taxes-summary-response.dto';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { FiscalLock } from '../receipts/fiscal-lock/fiscal-lock.decorator';
import { FiscalLockSource } from '../receipts/fiscal-lock/fiscal-lock.constants';
import { receiptActorOf } from '../receipts/audit/receipt-audit.util';
import { ReceiptTaxScope } from './constants/receipt-tax-scope.enum';

@ApiTags('Core - Billing transactions - Receipt Taxes')
@ApiBearerAuth()
@ApiExtraModels(ErrorResponse)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
@Controller('receipt-taxes')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.RECEIPTS_TAXES)
export class ReceiptTaxController {
  constructor(private readonly receiptTaxService: ReceiptTaxService) {}

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

  @Post()
  @FiscalLock(FiscalLockSource.BODY_RECEIPT)
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Create a new receipt tax',
    description:
      'The amount is calculated by the server: ITEM scope → taxable base of the receipt item (subtotal − discount); RECEIPT scope → receipt subtotal. Rounded to the cent. The receipt totals are recalculated immediately.',
  })
  @ApiBody({ type: CreateReceiptTaxDto })
  @ApiCreatedResponse({
    description: 'Receipt tax created',
    type: OneReceiptTaxResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid data', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({
    description: 'Receipt not found',
    type: ErrorResponse,
  })
  async create(
    @Body() dto: CreateReceiptTaxDto,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<OneReceiptTaxResponseDto> {
    const merchantId = this.merchantIdOf(req);
    return this.receiptTaxService.create(
      dto,
      merchantId,
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
  @ApiOperation({ summary: 'Get all receipt taxes (paginated)' })
  @ApiQuery({ name: 'receiptId', required: false, type: Number })
  @ApiQuery({ name: 'receiptItemId', required: false, type: Number })
  @ApiQuery({
    name: 'scope',
    required: false,
    enum: Object.values(ReceiptTaxScope),
  })
  @ApiQuery({ name: 'name', required: false, type: String })
  @ApiQuery({
    name: 'taxName',
    required: false,
    type: String,
    description: 'Tax type: exact tax name (case-insensitive)',
  })
  @ApiQuery({
    name: 'rate',
    required: false,
    type: Number,
    description: 'Applied rate (exact percentage)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['active', 'inactive', 'all'],
    description: 'Defaults to active',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: Object.values(ReceiptTaxSortBy),
  })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiOkResponse({
    description: 'Receipt taxes retrieved',
    type: AllPaginatedReceiptTaxes,
  })
  @ApiBadRequestResponse({ description: 'Invalid query', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  async findAll(
    @Query() query: GetReceiptTaxesQueryDto,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<AllPaginatedReceiptTaxes> {
    const merchantId = this.merchantIdOf(req);
    return this.receiptTaxService.findAll(query, merchantId);
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
    summary: 'Consolidated receipt tax metrics',
    description:
      'Counts (active/inactive), active tax charged per currency split by scope (RECEIPT vs ITEM), totals per tax type (name) and rate, and the tax types/rates available for filtering. Accepts the same filters as the list except status.',
  })
  @ApiQuery({ name: 'receiptId', required: false, type: Number })
  @ApiQuery({ name: 'receiptItemId', required: false, type: Number })
  @ApiQuery({
    name: 'scope',
    required: false,
    enum: Object.values(ReceiptTaxScope),
  })
  @ApiQuery({ name: 'name', required: false, type: String })
  @ApiQuery({ name: 'taxName', required: false, type: String })
  @ApiQuery({ name: 'rate', required: false, type: Number })
  @ApiOkResponse({
    description: 'Receipt taxes summary',
    type: ReceiptTaxesSummaryResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid query', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  async getSummary(
    @Query() query: GetReceiptTaxesSummaryQueryDto,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<ReceiptTaxesSummaryResponseDto> {
    const merchantId = this.merchantIdOf(req);
    return this.receiptTaxService.getSummary(query, merchantId);
  }

  @Get(':id')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Get a receipt tax by id' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Receipt tax retrieved',
    type: OneReceiptTaxResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid id', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Not found', type: ErrorResponse })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<OneReceiptTaxResponseDto> {
    const merchantId = this.merchantIdOf(req);
    return this.receiptTaxService.findOne(id, merchantId);
  }

  @Patch(':id')
  @FiscalLock(FiscalLockSource.TAX_PARAM)
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Update a receipt tax (name, rate, scope, item)',
    description:
      'The amount is recalculated by the server when rate, scope or item change, and the receipt totals are refreshed immediately. Inactive taxes must be activated before editing.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateReceiptTaxDto })
  @ApiOkResponse({
    description: 'Receipt tax updated',
    type: OneReceiptTaxResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid data', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Not found', type: ErrorResponse })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReceiptTaxDto,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<OneReceiptTaxResponseDto> {
    const merchantId = this.merchantIdOf(req);
    return this.receiptTaxService.update(
      id,
      dto,
      merchantId,
      receiptActorOf(req.user),
    );
  }

  @Patch(':id/status')
  @FiscalLock(FiscalLockSource.TAX_PARAM)
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Activate or deactivate a receipt tax',
    description:
      'Does not delete the record nor change its stored amount. Only active taxes count in the receipt totals, which are recalculated immediately.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateReceiptTaxStatusDto })
  @ApiOkResponse({
    description: 'Receipt tax status updated',
    type: OneReceiptTaxResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid data', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Not found', type: ErrorResponse })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReceiptTaxStatusDto,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<OneReceiptTaxResponseDto> {
    const merchantId = this.merchantIdOf(req);
    return this.receiptTaxService.updateStatus(
      id,
      dto,
      merchantId,
      receiptActorOf(req.user),
    );
  }

  @Delete(':id')
  @FiscalLock(FiscalLockSource.TAX_PARAM)
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Delete a receipt tax (logical: same as deactivating it)',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Receipt tax deleted',
    type: OneReceiptTaxResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid id', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Not found', type: ErrorResponse })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<OneReceiptTaxResponseDto> {
    const merchantId = this.merchantIdOf(req);
    return this.receiptTaxService.remove(
      id,
      merchantId,
      receiptActorOf(req.user),
    );
  }
}
