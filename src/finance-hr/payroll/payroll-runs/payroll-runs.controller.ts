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

import { PayrollRunsService } from './payroll-runs.service';
import { CreatePayrollRunDto } from './dto/create-payroll-run.dto';
import { UpdatePayrollRunDto } from './dto/update-payroll-run.dto';
import { GetPayrollRunsQueryDto } from './dto/get-payroll-runs-query.dto';
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
import { OnePayrollRunResponseDto } from './dto/payroll-run-response.dto';
import { PaginatedPayrollRunsResponseDto } from './dto/paginated-payroll-runs-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { PayrollRunStatus } from './constants/payroll-run-status.enum';
import { PayrollRunSortBy } from './dto/get-payroll-runs-query.dto';

@ApiTags('Payroll runs')
@ApiBearerAuth()
@Controller('payroll-runs')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.PAYROLL_RUNS)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
@ApiExtraModels(OnePayrollRunResponseDto, PaginatedPayrollRunsResponseDto)
export class PayrollRunsController {
  constructor(private readonly payrollRunsService: PayrollRunsService) {}

  @Post()
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Create payroll run' })
  @ApiBody({ type: CreatePayrollRunDto })
  @ApiCreatedResponse({
    description: 'Payroll run created successfully',
    type: OnePayrollRunResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input or period_end before period_start',
  })
  @ApiNotFoundResponse({ description: 'Company or merchant not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async create(
    @Body() dto: CreatePayrollRunDto,
  ): Promise<OnePayrollRunResponseDto> {
    return this.payrollRunsService.create(dto);
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
  @ApiOperation({ summary: 'Get all payroll runs (paginated)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'company_id', required: false })
  @ApiQuery({ name: 'merchant_id', required: false })
  @ApiQuery({ name: 'status', required: false, enum: PayrollRunStatus })
  @ApiQuery({ name: 'sortBy', required: false, enum: PayrollRunSortBy })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiOkResponse({
    description: 'Payroll runs retrieved successfully',
    type: PaginatedPayrollRunsResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findAll(
    @Query() query: GetPayrollRunsQueryDto,
  ): Promise<PaginatedPayrollRunsResponseDto> {
    return this.payrollRunsService.findAll(query);
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
  @ApiOperation({ summary: 'Get payroll run by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Payroll run ID' })
  @ApiOkResponse({
    description: 'Payroll run retrieved successfully',
    type: OnePayrollRunResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Payroll run not found' })
  @ApiBadRequestResponse({ description: 'Invalid ID' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OnePayrollRunResponseDto> {
    return this.payrollRunsService.findOne(id);
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
  @ApiOperation({ summary: 'Update payroll run' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdatePayrollRunDto })
  @ApiOkResponse({
    description: 'Payroll run updated successfully',
    type: OnePayrollRunResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input or period_end before period_start',
  })
  @ApiNotFoundResponse({
    description: 'Payroll run, company or merchant not found',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePayrollRunDto,
  ): Promise<OnePayrollRunResponseDto> {
    return this.payrollRunsService.update(id, dto);
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
  @ApiOperation({ summary: 'Delete payroll run (logical delete)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Payroll run deleted successfully',
    type: OnePayrollRunResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Payroll run not found' })
  @ApiBadRequestResponse({ description: 'Invalid ID' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OnePayrollRunResponseDto> {
    return this.payrollRunsService.remove(id);
  }
}
