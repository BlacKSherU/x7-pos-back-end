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

import { PayrollEntriesService } from './payroll-entries.service';
import { CreatePayrollEntryDto } from './dto/create-payroll-entry.dto';
import { UpdatePayrollEntryDto } from './dto/update-payroll-entry.dto';
import { GetPayrollEntriesQueryDto } from './dto/get-payroll-entries-query.dto';
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
import { OnePayrollEntryResponseDto } from './dto/payroll-entry-response.dto';
import { PaginatedPayrollEntriesResponseDto } from './dto/paginated-payroll-entries-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { PayrollEntrySortBy } from './dto/get-payroll-entries-query.dto';

@ApiTags('Payroll entries')
@ApiBearerAuth()
@Controller('payroll-entries')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.PAYROLL_ENTRIES)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
@ApiExtraModels(OnePayrollEntryResponseDto, PaginatedPayrollEntriesResponseDto)
export class PayrollEntriesController {
  constructor(private readonly payrollEntriesService: PayrollEntriesService) {}

  @Post()
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Create payroll entry' })
  @ApiBody({ type: CreatePayrollEntryDto })
  @ApiCreatedResponse({
    description: 'Payroll entry created successfully',
    type: OnePayrollEntryResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input or validation error' })
  @ApiNotFoundResponse({ description: 'Payroll run or collaborator not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async create(
    @Body() dto: CreatePayrollEntryDto,
  ): Promise<OnePayrollEntryResponseDto> {
    return this.payrollEntriesService.create(dto);
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
  @ApiOperation({ summary: 'Get all payroll entries (paginated)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'payroll_run_id', required: false })
  @ApiQuery({ name: 'collaborator_id', required: false })
  @ApiQuery({ name: 'sortBy', required: false, enum: PayrollEntrySortBy })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiOkResponse({
    description: 'Payroll entries retrieved successfully',
    type: PaginatedPayrollEntriesResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findAll(
    @Query() query: GetPayrollEntriesQueryDto,
  ): Promise<PaginatedPayrollEntriesResponseDto> {
    return this.payrollEntriesService.findAll(query);
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
  @ApiOperation({ summary: 'Get payroll entry by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Payroll entry ID' })
  @ApiOkResponse({
    description: 'Payroll entry retrieved successfully',
    type: OnePayrollEntryResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Payroll entry not found' })
  @ApiBadRequestResponse({ description: 'Invalid ID' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OnePayrollEntryResponseDto> {
    return this.payrollEntriesService.findOne(id);
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
  @ApiOperation({ summary: 'Update payroll entry' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdatePayrollEntryDto })
  @ApiOkResponse({
    description: 'Payroll entry updated successfully',
    type: OnePayrollEntryResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input or validation error' })
  @ApiNotFoundResponse({
    description: 'Payroll entry, payroll run or collaborator not found',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePayrollEntryDto,
  ): Promise<OnePayrollEntryResponseDto> {
    return this.payrollEntriesService.update(id, dto);
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
  @ApiOperation({ summary: 'Delete payroll entry (logical delete)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Payroll entry deleted successfully',
    type: OnePayrollEntryResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Payroll entry not found' })
  @ApiBadRequestResponse({ description: 'Invalid ID' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OnePayrollEntryResponseDto> {
    return this.payrollEntriesService.remove(id);
  }
}
