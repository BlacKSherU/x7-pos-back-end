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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiBody,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiExtraModels,
  ApiQuery,
} from '@nestjs/swagger';
import { SupplierInvoiceItemService } from './supplier-invoice-item.service';
import { CreateSupplierInvoiceItemDto } from './dto/create-supplier-invoice-item.dto';
import { UpdateSupplierInvoiceItemDto } from './dto/update-supplier-invoice-item.dto';
import {
  GetSupplierInvoiceItemsQueryDto,
  SupplierInvoiceItemSortBy,
} from './dto/get-supplier-invoice-items-query.dto';
import { OneSupplierInvoiceItemResponseDto } from './dto/supplier-invoice-item-response.dto';
import { PaginatedSupplierInvoiceItemsResponseDto } from './dto/paginated-supplier-invoice-items-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';

@ApiTags('Supplier invoice items (Account payable)')
@ApiBearerAuth()
@Controller('supplier-invoice-items')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiExtraModels(
  OneSupplierInvoiceItemResponseDto,
  PaginatedSupplierInvoiceItemsResponseDto,
)
export class SupplierInvoiceItemController {
  constructor(
    private readonly supplierInvoiceItemService: SupplierInvoiceItemService,
  ) {}

  @Post()
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Create supplier invoice line item' })
  @ApiBody({ type: CreateSupplierInvoiceItemDto })
  @ApiCreatedResponse({
    description: 'Supplier invoice item created successfully',
    type: OneSupplierInvoiceItemResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input' })
  @ApiNotFoundResponse({ description: 'Invoice or product not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async create(
    @Body() dto: CreateSupplierInvoiceItemDto,
  ): Promise<OneSupplierInvoiceItemResponseDto> {
    return this.supplierInvoiceItemService.create(dto);
  }

  @Get()
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'List supplier invoice items (paginated)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'invoice_id', required: false })
  @ApiQuery({ name: 'product_id', required: false })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: SupplierInvoiceItemSortBy,
  })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiOkResponse({
    description: 'Supplier invoice items retrieved successfully',
    type: PaginatedSupplierInvoiceItemsResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findAll(
    @Query() query: GetSupplierInvoiceItemsQueryDto,
  ): Promise<PaginatedSupplierInvoiceItemsResponseDto> {
    return this.supplierInvoiceItemService.findAll(query);
  }

  @Get(':id')
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Get supplier invoice item by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Supplier invoice item retrieved successfully',
    type: OneSupplierInvoiceItemResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Not found' })
  @ApiBadRequestResponse({ description: 'Invalid ID' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OneSupplierInvoiceItemResponseDto> {
    return this.supplierInvoiceItemService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Update supplier invoice item' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateSupplierInvoiceItemDto })
  @ApiOkResponse({
    description: 'Supplier invoice item updated successfully',
    type: OneSupplierInvoiceItemResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input' })
  @ApiNotFoundResponse({ description: 'Not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSupplierInvoiceItemDto,
  ): Promise<OneSupplierInvoiceItemResponseDto> {
    return this.supplierInvoiceItemService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Delete supplier invoice item (logical delete)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Supplier invoice item deleted successfully',
    type: OneSupplierInvoiceItemResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Not found' })
  @ApiBadRequestResponse({ description: 'Invalid ID' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OneSupplierInvoiceItemResponseDto> {
    return this.supplierInvoiceItemService.remove(id);
  }
}
