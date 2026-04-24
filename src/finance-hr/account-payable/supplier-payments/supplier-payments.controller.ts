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

import { SupplierPaymentsService } from './supplier-payments.service';
import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto';
import { UpdateSupplierPaymentDto } from './dto/update-supplier-payment.dto';
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
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import {
  GetSupplierPaymentsQueryDto,
  SupplierPaymentSortBy,
} from './dto/get-supplier-payments-query.dto';
import { SupplierPaymentStatus } from './constants/supplier-payment-status.enum';
import { OneSupplierPaymentResponseDto } from './dto/supplier-payment-response.dto';
import { PaginatedSupplierPaymentsResponseDto } from './dto/paginated-supplier-payments-response.dto';

@ApiTags('Supplier payments (Account payable)')
@ApiBearerAuth()
@Controller('supplier-payments')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.SUPPLIER_PAYMENTS)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
@ApiExtraModels(
  OneSupplierPaymentResponseDto,
  PaginatedSupplierPaymentsResponseDto,
)
export class SupplierPaymentsController {
  constructor(
    private readonly supplierPaymentsService: SupplierPaymentsService,
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
  @ApiOperation({ summary: 'Create supplier payment' })
  @ApiBody({ type: CreateSupplierPaymentDto })
  @ApiCreatedResponse({
    description: 'Supplier payment created successfully',
    type: OneSupplierPaymentResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input or validation error' })
  @ApiNotFoundResponse({ description: 'Company or supplier not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async create(
    @Body() createSupplierPaymentDto: CreateSupplierPaymentDto,
  ): Promise<OneSupplierPaymentResponseDto> {
    return this.supplierPaymentsService.create(createSupplierPaymentDto);
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
  @ApiOperation({ summary: 'Get all supplier payments (paginated)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'company_id', required: false })
  @ApiQuery({ name: 'supplier_id', required: false })
  @ApiQuery({ name: 'status', required: false, enum: SupplierPaymentStatus })
  @ApiQuery({ name: 'sortBy', required: false, enum: SupplierPaymentSortBy })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiOkResponse({
    description: 'Supplier payments retrieved successfully',
    type: PaginatedSupplierPaymentsResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findAll(
    @Query() query: GetSupplierPaymentsQueryDto,
  ): Promise<PaginatedSupplierPaymentsResponseDto> {
    return this.supplierPaymentsService.findAll(query);
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
  @ApiOperation({ summary: 'Get supplier payment by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Supplier payment retrieved successfully',
    type: OneSupplierPaymentResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Supplier payment not found' })
  @ApiBadRequestResponse({ description: 'Invalid ID' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OneSupplierPaymentResponseDto> {
    return this.supplierPaymentsService.findOne(id);
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
  @ApiOperation({ summary: 'Update supplier payment' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateSupplierPaymentDto })
  @ApiOkResponse({
    description: 'Supplier payment updated successfully',
    type: OneSupplierPaymentResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input' })
  @ApiNotFoundResponse({
    description: 'Supplier payment, company or supplier not found',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSupplierPaymentDto: UpdateSupplierPaymentDto,
  ): Promise<OneSupplierPaymentResponseDto> {
    return this.supplierPaymentsService.update(id, updateSupplierPaymentDto);
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
  @ApiOperation({ summary: 'Delete supplier payment (logical delete)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Supplier payment deleted successfully',
    type: OneSupplierPaymentResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Supplier payment not found' })
  @ApiBadRequestResponse({ description: 'Invalid ID' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OneSupplierPaymentResponseDto> {
    return this.supplierPaymentsService.remove(id);
  }
}
