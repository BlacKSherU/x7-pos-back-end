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

import { ReceiptItemService } from './receipt-item.service';
import { CreateReceiptItemDto } from './dto/create-receipt-item.dto';
import { UpdateReceiptItemDto } from './dto/update-receipt-item.dto';
import {
  GetReceiptItemsQueryDto,
  RECEIPT_ITEM_STATUS_FILTERS,
  ReceiptItemSortBy,
} from './dto/get-receipt-items-query.dto';
import { ReceiptItemOptionsResponseDto } from './dto/receipt-item-options.dto';
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
import { OneReceiptItemResponseDto } from './dto/receipt-item-response.dto';
import { AllPaginatedReceiptItems } from './dto/all-paginated-receipt-items.dto';
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

@ApiTags('Core - Billing transactions - Receipt Items')
@ApiBearerAuth()
@ApiExtraModels(ErrorResponse)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
@Controller('receipt-items')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.RECEIPT_ITEMS)
export class ReceiptItemController {
  constructor(private readonly receiptItemService: ReceiptItemService) {}

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
    summary: 'Create a new receipt item',
    description:
      'The server calculates subtotal = round2(quantity × unitPrice) and total = subtotal − discountAmount (discount must be >= 0 and <= subtotal), then re-synchronises the parent receipt totals.',
  })
  @ApiBody({ type: CreateReceiptItemDto })
  @ApiCreatedResponse({
    description: 'Receipt item created',
    type: OneReceiptItemResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid data', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({
    description: 'Receipt not found',
    type: ErrorResponse,
  })
  async create(
    @Body() dto: CreateReceiptItemDto,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<OneReceiptItemResponseDto> {
    const merchantId = this.merchantIdOf(req);
    return this.receiptItemService.create(
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
  @ApiOperation({
    summary: 'Get all receipt items (paginated)',
    description:
      'Lines of the merchant active receipts. Filters: search (description/SKU), receiptId (invoice/receipt selector), sku or itemName (item selector) and isActive (logical status).',
  })
  @ApiQuery({ name: 'receiptId', required: false, type: Number })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Partial match on description (name) or SKU',
  })
  @ApiQuery({ name: 'name', required: false, type: String })
  @ApiQuery({
    name: 'sku',
    required: false,
    type: String,
    description: 'Exact SKU (item selector)',
  })
  @ApiQuery({
    name: 'itemName',
    required: false,
    type: String,
    description: 'Exact item name (item selector, lines without SKU)',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    enum: RECEIPT_ITEM_STATUS_FILTERS,
    description: "'true' (default) | 'false' | 'all'",
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: Object.values(ReceiptItemSortBy),
  })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiOkResponse({
    description: 'Receipt items retrieved',
    type: AllPaginatedReceiptItems,
  })
  @ApiBadRequestResponse({ description: 'Invalid query', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  async findAll(
    @Query() query: GetReceiptItemsQueryDto,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<AllPaginatedReceiptItems> {
    const merchantId = this.merchantIdOf(req);
    return this.receiptItemService.findAll(query, merchantId);
  }

  // Declared before ':id' so "item-options" is not parsed as an id.
  @Get('item-options')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Distinct items (name + SKU) of the merchant receipt lines',
    description:
      'Feeds the item selector of the INVOICE LINE ITEMS header. Only active lines of active receipts; up to 500 entries ordered by name.',
  })
  @ApiOkResponse({
    description: 'Item options retrieved',
    type: ReceiptItemOptionsResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  async findItemOptions(
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<ReceiptItemOptionsResponseDto> {
    const merchantId = this.merchantIdOf(req);
    return this.receiptItemService.findItemOptions(merchantId);
  }

  @Get(':id')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Get a receipt item by id' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Receipt item retrieved',
    type: OneReceiptItemResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid id', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Not found', type: ErrorResponse })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<OneReceiptItemResponseDto> {
    const merchantId = this.merchantIdOf(req);
    return this.receiptItemService.findOne(id, merchantId);
  }

  @Patch(':id')
  @FiscalLock(FiscalLockSource.ITEM_PARAM)
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Update a receipt item',
    description:
      'Edits name, sku, quantity, unitPrice, discountAmount, metadata and/or the logical status (isActive). subtotal and total are always recalculated by the server and the parent receipt totals are re-synchronised. A deleted line can only be updated to restore it (isActive: true).',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateReceiptItemDto })
  @ApiOkResponse({
    description: 'Receipt item updated',
    type: OneReceiptItemResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid data', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Not found', type: ErrorResponse })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReceiptItemDto,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<OneReceiptItemResponseDto> {
    const merchantId = this.merchantIdOf(req);
    return this.receiptItemService.update(
      id,
      dto,
      merchantId,
      receiptActorOf(req.user),
    );
  }

  @Delete(':id')
  @FiscalLock(FiscalLockSource.ITEM_PARAM)
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Delete a receipt item (logical deletion)',
    description:
      'Sets is_active = false (the row is kept for audit) and recalculates the parent receipt totals.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Receipt item deleted',
    type: OneReceiptItemResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid id', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Not found', type: ErrorResponse })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<OneReceiptItemResponseDto> {
    const merchantId = this.merchantIdOf(req);
    return this.receiptItemService.remove(
      id,
      merchantId,
      receiptActorOf(req.user),
    );
  }
}
