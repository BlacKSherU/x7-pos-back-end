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
import { SupplierPaymentItemsService } from './supplier-payment-items.service';
import { CreateSupplierPaymentItemDto } from './dto/create-supplier-payment-item.dto';
import { UpdateSupplierPaymentItemDto } from './dto/update-supplier-payment-item.dto';
import {
  GetSupplierPaymentItemsQueryDto,
  SupplierPaymentItemSortBy,
} from './dto/get-supplier-payment-items-query.dto';
import {
  OneSupplierPaymentItemResponseDto,
} from './dto/supplier-payment-item-response.dto';
import { PaginatedSupplierPaymentItemsResponseDto } from './dto/paginated-supplier-payment-items-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';

@ApiTags('Supplier payment items (Account payable)')
@ApiBearerAuth()
@Controller('supplier-payment-items')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiExtraModels(
  OneSupplierPaymentItemResponseDto,
  PaginatedSupplierPaymentItemsResponseDto,
)
export class SupplierPaymentItemsController {
  constructor(
    private readonly supplierPaymentItemsService: SupplierPaymentItemsService,
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
  @ApiOperation({ summary: 'Create supplier payment item (line / concept)' })
  @ApiBody({ type: CreateSupplierPaymentItemDto })
  @ApiCreatedResponse({
    description: 'Supplier payment item created successfully',
    type: OneSupplierPaymentItemResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input' })
  @ApiNotFoundResponse({ description: 'Supplier payment not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async create(
    @Body() dto: CreateSupplierPaymentItemDto,
  ): Promise<OneSupplierPaymentItemResponseDto> {
    return this.supplierPaymentItemsService.create(dto);
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
  @ApiOperation({ summary: 'List supplier payment items (paginated)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'payment_id', required: false })
  @ApiQuery({ name: 'document_type', required: false })
  @ApiQuery({ name: 'sortBy', required: false, enum: SupplierPaymentItemSortBy })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiOkResponse({
    description: 'Supplier payment items retrieved successfully',
    type: PaginatedSupplierPaymentItemsResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findAll(
    @Query() query: GetSupplierPaymentItemsQueryDto,
  ): Promise<PaginatedSupplierPaymentItemsResponseDto> {
    return this.supplierPaymentItemsService.findAll(query);
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
  @ApiOperation({ summary: 'Get supplier payment item by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Supplier payment item retrieved successfully',
    type: OneSupplierPaymentItemResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Not found' })
  @ApiBadRequestResponse({ description: 'Invalid ID' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OneSupplierPaymentItemResponseDto> {
    return this.supplierPaymentItemsService.findOne(id);
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
  @ApiOperation({ summary: 'Update supplier payment item' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateSupplierPaymentItemDto })
  @ApiOkResponse({
    description: 'Supplier payment item updated successfully',
    type: OneSupplierPaymentItemResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input' })
  @ApiNotFoundResponse({ description: 'Not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSupplierPaymentItemDto,
  ): Promise<OneSupplierPaymentItemResponseDto> {
    return this.supplierPaymentItemsService.update(id, dto);
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
  @ApiOperation({ summary: 'Delete supplier payment item (logical delete)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Supplier payment item deleted successfully',
    type: OneSupplierPaymentItemResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Not found' })
  @ApiBadRequestResponse({ description: 'Invalid ID' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OneSupplierPaymentItemResponseDto> {
    return this.supplierPaymentItemsService.remove(id);
  }
}
