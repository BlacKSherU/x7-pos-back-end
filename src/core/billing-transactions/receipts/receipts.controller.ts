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
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';

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
    return this.receiptsService.create(dto, authenticatedUserMerchantId);
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
      'Paginated receipts of the merchant. `search` matches invoice_number or fiscal_data (case-insensitive, partial). `status` filters by is_active (active by default).',
  })
  @ApiQuery({ name: 'orderId', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: Object.values(ReceiptStatusFilter),
  })
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

  // Rutas estáticas antes de ':id' (si no, ParseIntPipe recibiría 'summary').
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
      'Active / inactive / locked receipt counts and sums of grand_total, subtotal, taxes and discounts of the merchant, filtered by is_active (`status`, active by default), with breakdowns by type and currency.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: Object.values(ReceiptStatusFilter),
  })
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

  @Put(':id')
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
    return this.receiptsService.update(id, dto, authenticatedUserMerchantId);
  }

  @Patch(':id')
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
    return this.receiptsService.update(id, dto, authenticatedUserMerchantId);
  }

  @Patch(':id/status')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Change receipt status (logical delete / reactivate)',
    description:
      'isActive=false performs a logical deletion (the financial history is kept); isActive=true reactivates a logically deleted receipt.',
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
    );
  }

  @Delete(':id')
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
    return this.receiptsService.remove(id, authenticatedUserMerchantId);
  }
}
