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
import { PayrollAdjustmentsService } from './payroll-adjustments.service';
import { CreatePayrollAdjustmentDto } from './dto/create-payroll-adjustment.dto';
import { UpdatePayrollAdjustmentDto } from './dto/update-payroll-adjustment.dto';
import { GetPayrollAdjustmentsQueryDto } from './dto/get-payroll-adjustments-query.dto';
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
import { OnePayrollAdjustmentResponseDto } from './dto/payroll-adjustment-response.dto';
import { PaginatedPayrollAdjustmentsResponseDto } from './dto/paginated-payroll-adjustments-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { AdjustmentType } from './constants/adjustment-type.enum';
import { PayrollAdjustmentSortBy } from './dto/get-payroll-adjustments-query.dto';

@ApiTags('Payroll adjustments')
@ApiBearerAuth()
@Controller('payroll-adjustments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiExtraModels(
  OnePayrollAdjustmentResponseDto,
  PaginatedPayrollAdjustmentsResponseDto,
)
export class PayrollAdjustmentsController {
  constructor(
    private readonly payrollAdjustmentsService: PayrollAdjustmentsService,
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
  @ApiOperation({ summary: 'Create payroll adjustment' })
  @ApiBody({ type: CreatePayrollAdjustmentDto })
  @ApiCreatedResponse({
    description: 'Payroll adjustment created successfully',
    type: OnePayrollAdjustmentResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input or validation error' })
  @ApiNotFoundResponse({ description: 'Payroll entry not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async create(
    @Body() dto: CreatePayrollAdjustmentDto,
  ): Promise<OnePayrollAdjustmentResponseDto> {
    return this.payrollAdjustmentsService.create(dto);
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
  @ApiOperation({ summary: 'Get all payroll adjustments (paginated)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'payroll_entry_id', required: false })
  @ApiQuery({ name: 'adjustment_type', required: false, enum: AdjustmentType })
  @ApiQuery({ name: 'sortBy', required: false, enum: PayrollAdjustmentSortBy })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiOkResponse({
    description: 'Payroll adjustments retrieved successfully',
    type: PaginatedPayrollAdjustmentsResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findAll(
    @Query() query: GetPayrollAdjustmentsQueryDto,
  ): Promise<PaginatedPayrollAdjustmentsResponseDto> {
    return this.payrollAdjustmentsService.findAll(query);
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
  @ApiOperation({ summary: 'Get payroll adjustment by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Payroll adjustment ID' })
  @ApiOkResponse({
    description: 'Payroll adjustment retrieved successfully',
    type: OnePayrollAdjustmentResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Payroll adjustment not found' })
  @ApiBadRequestResponse({ description: 'Invalid ID' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OnePayrollAdjustmentResponseDto> {
    return this.payrollAdjustmentsService.findOne(id);
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
  @ApiOperation({ summary: 'Update payroll adjustment' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdatePayrollAdjustmentDto })
  @ApiOkResponse({
    description: 'Payroll adjustment updated successfully',
    type: OnePayrollAdjustmentResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input or validation error' })
  @ApiNotFoundResponse({
    description: 'Payroll adjustment or payroll entry not found',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePayrollAdjustmentDto,
  ): Promise<OnePayrollAdjustmentResponseDto> {
    return this.payrollAdjustmentsService.update(id, dto);
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
  @ApiOperation({ summary: 'Delete payroll adjustment (logical delete)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Payroll adjustment deleted successfully',
    type: OnePayrollAdjustmentResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Payroll adjustment not found' })
  @ApiBadRequestResponse({ description: 'Invalid ID' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OnePayrollAdjustmentResponseDto> {
    return this.payrollAdjustmentsService.remove(id);
  }
}
