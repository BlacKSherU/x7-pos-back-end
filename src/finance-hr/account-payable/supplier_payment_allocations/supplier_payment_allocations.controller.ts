import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  ParseIntPipe,
  Put,
  UseGuards,
  Query,
} from '@nestjs/common';
import { SupplierPaymentAllocationsService } from './supplier_payment_allocations.service';
import { CreateSupplierPaymentAllocationDto } from './dto/create-supplier_payment_allocation.dto';
import { UpdateSupplierPaymentAllocationDto } from './dto/update-supplier_payment_allocation.dto';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import {
  GetSupplierPaymentAllocationsQueryDto,
  SupplierPaymentAllocationSortBy,
} from './dto/get-supplier_payment_allocations-query.dto';
import { OneSupplierPaymentAllocationResponseDto } from './dto/supplier_payment_allocation-response.dto';
import { PaginatedSupplierPaymentAllocationsResponseDto } from './dto/paginated-supplier_payment_allocations-response.dto';

@ApiTags('Supplier payment allocations (Account payable)')
@ApiBearerAuth()
@Controller('supplier-payment-allocations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiExtraModels(
  OneSupplierPaymentAllocationResponseDto,
  PaginatedSupplierPaymentAllocationsResponseDto,
)
export class SupplierPaymentAllocationsController {
  constructor(
    private readonly supplierPaymentAllocationsService: SupplierPaymentAllocationsService,
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
  @ApiOperation({ summary: 'Create supplier payment allocation' })
  @ApiBody({ type: CreateSupplierPaymentAllocationDto })
  @ApiCreatedResponse({
    description: 'Supplier payment allocation created successfully',
    type: OneSupplierPaymentAllocationResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input' })
  @ApiNotFoundResponse({
    description: 'Supplier, payment or credit note not found',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async create(
    @Body()
    createSupplierPaymentAllocationDto: CreateSupplierPaymentAllocationDto,
  ) {
    return this.supplierPaymentAllocationsService.create(
      createSupplierPaymentAllocationDto,
    );
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
  @ApiOperation({ summary: 'Get all supplier payment allocations (paginated)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'payment_id', required: false })
  @ApiQuery({ name: 'supplier_id', required: false })
  @ApiQuery({ name: 'credit_note_id', required: false })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: SupplierPaymentAllocationSortBy,
  })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiOkResponse({
    description: 'Supplier payment allocations retrieved successfully',
    type: PaginatedSupplierPaymentAllocationsResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findAll(@Query() query: GetSupplierPaymentAllocationsQueryDto) {
    return this.supplierPaymentAllocationsService.findAll(query);
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
  @ApiOperation({ summary: 'Get supplier payment allocation by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Supplier payment allocation retrieved successfully',
    type: OneSupplierPaymentAllocationResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Not found' })
  @ApiBadRequestResponse({ description: 'Invalid ID' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.supplierPaymentAllocationsService.findOne(id);
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
  @ApiOperation({ summary: 'Update supplier payment allocation' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateSupplierPaymentAllocationDto })
  @ApiOkResponse({
    description: 'Supplier payment allocation updated successfully',
    type: OneSupplierPaymentAllocationResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input' })
  @ApiNotFoundResponse({ description: 'Not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    updateSupplierPaymentAllocationDto: UpdateSupplierPaymentAllocationDto,
  ) {
    return this.supplierPaymentAllocationsService.update(
      id,
      updateSupplierPaymentAllocationDto,
    );
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
  @ApiOperation({
    summary: 'Delete supplier payment allocation (logical delete)',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Supplier payment allocation deleted successfully',
    type: OneSupplierPaymentAllocationResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Not found' })
  @ApiBadRequestResponse({ description: 'Invalid ID' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.supplierPaymentAllocationsService.remove(id);
  }
}
