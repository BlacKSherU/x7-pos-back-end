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
import { PayrollTaxDetailsService } from './payroll-tax-details.service';
import { CreatePayrollTaxDetailDto } from './dto/create-payroll-tax-detail.dto';
import { UpdatePayrollTaxDetailDto } from './dto/update-payroll-tax-detail.dto';
import { GetPayrollTaxDetailsQueryDto } from './dto/get-payroll-tax-details-query.dto';
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
import { OnePayrollTaxDetailResponseDto } from './dto/payroll-tax-detail-response.dto';
import { PaginatedPayrollTaxDetailsResponseDto } from './dto/paginated-payroll-tax-details-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { PayrollTaxDetailSortBy } from './dto/get-payroll-tax-details-query.dto';

@ApiTags('Payroll tax details')
@ApiBearerAuth()
@Controller('payroll-tax-details')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiExtraModels(
  OnePayrollTaxDetailResponseDto,
  PaginatedPayrollTaxDetailsResponseDto,
)
export class PayrollTaxDetailsController {
  constructor(
    private readonly payrollTaxDetailsService: PayrollTaxDetailsService,
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
  @ApiOperation({ summary: 'Create payroll tax detail' })
  @ApiBody({ type: CreatePayrollTaxDetailDto })
  @ApiCreatedResponse({
    description: 'Payroll tax detail created successfully',
    type: OnePayrollTaxDetailResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input or validation error' })
  @ApiNotFoundResponse({ description: 'Payroll entry not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async create(
    @Body() dto: CreatePayrollTaxDetailDto,
  ): Promise<OnePayrollTaxDetailResponseDto> {
    return this.payrollTaxDetailsService.create(dto);
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
  @ApiOperation({ summary: 'Get all payroll tax details (paginated)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'payroll_entry_id', required: false })
  @ApiQuery({ name: 'sortBy', required: false, enum: PayrollTaxDetailSortBy })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiOkResponse({
    description: 'Payroll tax details retrieved successfully',
    type: PaginatedPayrollTaxDetailsResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findAll(
    @Query() query: GetPayrollTaxDetailsQueryDto,
  ): Promise<PaginatedPayrollTaxDetailsResponseDto> {
    return this.payrollTaxDetailsService.findAll(query);
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
  @ApiOperation({ summary: 'Get payroll tax detail by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Payroll tax detail ID' })
  @ApiOkResponse({
    description: 'Payroll tax detail retrieved successfully',
    type: OnePayrollTaxDetailResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Payroll tax detail not found' })
  @ApiBadRequestResponse({ description: 'Invalid ID' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OnePayrollTaxDetailResponseDto> {
    return this.payrollTaxDetailsService.findOne(id);
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
  @ApiOperation({ summary: 'Update payroll tax detail' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdatePayrollTaxDetailDto })
  @ApiOkResponse({
    description: 'Payroll tax detail updated successfully',
    type: OnePayrollTaxDetailResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input or validation error' })
  @ApiNotFoundResponse({
    description: 'Payroll tax detail or payroll entry not found',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePayrollTaxDetailDto,
  ): Promise<OnePayrollTaxDetailResponseDto> {
    return this.payrollTaxDetailsService.update(id, dto);
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
  @ApiOperation({ summary: 'Delete payroll tax detail (logical delete)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Payroll tax detail deleted successfully',
    type: OnePayrollTaxDetailResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Payroll tax detail not found' })
  @ApiBadRequestResponse({ description: 'Invalid ID' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OnePayrollTaxDetailResponseDto> {
    return this.payrollTaxDetailsService.remove(id);
  }
}
