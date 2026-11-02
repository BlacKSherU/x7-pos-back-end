import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  ParseIntPipe,
  UseGuards,
  Query,
} from '@nestjs/common';
import { FeatureAccessGuard } from 'src/auth/guards/feature-access.guard';
import { RequireFeature } from 'src/auth/decorators/require-feature.decorator';
import { SUBSCRIPTION_FEATURE_IDS } from 'src/common/subscription/subscription-feature-ids';

import { SupplierInvoicesService } from './supplier-invoices.service';
import { CreateSupplierInvoiceDto } from './dto/create-supplier-invoice.dto';
import { UpdateSupplierInvoiceDto } from './dto/update-supplier-invoice.dto';
import { GetSupplierInvoicesQueryDto } from './dto/get-supplier-invoices-query.dto';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiExtraModels,
} from '@nestjs/swagger';
import { OneSupplierInvoiceResponseDto } from './dto/supplier-invoice-response.dto';
import { PaginatedSupplierInvoicesResponseDto } from './dto/paginated-supplier-invoices-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { SupplierInvoiceStatus } from './constants/supplier-invoice-status.enum';
import { SupplierInvoiceSortBy } from './dto/get-supplier-invoices-query.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { SupplierInvoiceInventoryService } from 'src/inventory/supplier-invoice-inventory/supplier-invoice-inventory.service';
import { ReceiveSupplierInventoryDto } from 'src/inventory/supplier-invoice-inventory/dto/receive-supplier-inventory.dto';
import { ReceiveSupplierInventoryResponseDto } from 'src/inventory/supplier-invoice-inventory/dto/receive-supplier-inventory-response.dto';
import { ApiConflictResponse } from '@nestjs/swagger';

@ApiTags('Finance & HR - Account payable - Supplier invoices')
@ApiBearerAuth()
@Controller('supplier-invoices')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.SUPPLIER_INVOICES)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
@ApiExtraModels(
  OneSupplierInvoiceResponseDto,
  PaginatedSupplierInvoicesResponseDto,
)
export class SupplierInvoicesController {
  constructor(
    private readonly supplierInvoicesService: SupplierInvoicesService,
    private readonly supplierInvoiceInventoryService: SupplierInvoiceInventoryService,
  ) {}

  @Post(':id/receive-inventory')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(Scope.MERCHANT_WEB)
  @RequireFeature(SUBSCRIPTION_FEATURE_IDS.STOCK_AND_STOCK_MOVEMENTS)
  @ApiOperation({
    summary: 'Receive supplier invoice into stock (WACC + PURCHASE_ENTRY)',
    description:
      'Idempotent per invoice. Invoice lines must include product_id and variant_id. Uses locationId from the body or merchant defaultSalesStockLocationId. Updates weighted average cost and may trigger inventory stock alerts.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: ReceiveSupplierInventoryDto })
  @ApiOkResponse({
    description: 'Inventory received successfully',
    type: ReceiveSupplierInventoryResponseDto,
  })
  @ApiConflictResponse({
    description: 'Inventory was already received for this invoice',
  })
  @ApiBadRequestResponse({
    description: 'Invalid input or missing stock location',
  })
  @ApiNotFoundResponse({ description: 'Supplier invoice not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({
    description: 'Forbidden (MERCHANT_WEB scope required)',
  })
  async receiveInventory(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReceiveSupplierInventoryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ReceiveSupplierInventoryResponseDto> {
    return this.supplierInvoiceInventoryService.receiveForInvoice(
      user.merchant.id,
      id,
      dto.locationId,
    );
  }

  @Post()
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Create supplier invoice' })
  @ApiBody({ type: CreateSupplierInvoiceDto })
  @ApiCreatedResponse({
    description: 'Supplier invoice created successfully',
    type: OneSupplierInvoiceResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input or validation error' })
  @ApiNotFoundResponse({ description: 'Company or supplier not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async create(
    @Body() dto: CreateSupplierInvoiceDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OneSupplierInvoiceResponseDto> {
    return this.supplierInvoicesService.create(
      dto,
      this.merchantCompanyScope(user),
    );
  }

  /**
   * For merchant users, returns the company that owns their merchant so the service can
   * enforce multi-tenant scoping (they can only read/write their own company's invoices).
   * Portal users get `undefined`, preserving cross-company access via the optional filter.
   */
  private merchantCompanyScope(user: AuthenticatedUser): number | undefined {
    const isMerchant =
      user.role === UserRole.MERCHANT_ADMIN ||
      user.role === UserRole.MERCHANT_USER;
    return isMerchant ? user.merchant?.companyId : undefined;
  }

  @Get()
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Get all supplier invoices (paginated)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'company_id', required: false })
  @ApiQuery({ name: 'supplier_id', required: false })
  @ApiQuery({ name: 'status', required: false, enum: SupplierInvoiceStatus })
  @ApiQuery({ name: 'sortBy', required: false, enum: SupplierInvoiceSortBy })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiOkResponse({
    description: 'Supplier invoices retrieved successfully',
    type: PaginatedSupplierInvoicesResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findAll(
    @Query() query: GetSupplierInvoicesQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedSupplierInvoicesResponseDto> {
    return this.supplierInvoicesService.findAll(
      query,
      this.merchantCompanyScope(user),
    );
  }

  @Get(':id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Get supplier invoice by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Supplier invoice retrieved successfully',
    type: OneSupplierInvoiceResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Supplier invoice not found' })
  @ApiBadRequestResponse({ description: 'Invalid ID' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OneSupplierInvoiceResponseDto> {
    return this.supplierInvoicesService.findOne(
      id,
      this.merchantCompanyScope(user),
    );
  }

  @Put(':id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Update supplier invoice' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateSupplierInvoiceDto })
  @ApiOkResponse({
    description: 'Supplier invoice updated successfully',
    type: OneSupplierInvoiceResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input' })
  @ApiNotFoundResponse({
    description: 'Supplier invoice, company or supplier not found',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSupplierInvoiceDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OneSupplierInvoiceResponseDto> {
    return this.supplierInvoicesService.update(
      id,
      dto,
      this.merchantCompanyScope(user),
    );
  }

  @Delete(':id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Delete supplier invoice (logical delete)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Supplier invoice deleted successfully',
    type: OneSupplierInvoiceResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Supplier invoice not found' })
  @ApiBadRequestResponse({ description: 'Invalid ID' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OneSupplierInvoiceResponseDto> {
    return this.supplierInvoicesService.remove(
      id,
      this.merchantCompanyScope(user),
    );
  }

  @Post(':id/restore')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Restore a soft-deleted (archived) supplier invoice',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Supplier invoice restored successfully',
    type: OneSupplierInvoiceResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Archived supplier invoice not found' })
  @ApiBadRequestResponse({ description: 'Invalid ID' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async restore(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OneSupplierInvoiceResponseDto> {
    return this.supplierInvoicesService.restore(
      id,
      this.merchantCompanyScope(user),
    );
  }
}
