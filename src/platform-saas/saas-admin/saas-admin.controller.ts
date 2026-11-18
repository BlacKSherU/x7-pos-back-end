// src/platform-saas/saas-admin/saas-admin.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { UserRole } from '../users/constants/role.enum';
import { Scope } from '../users/constants/scope.enum';
import { CompanyConfigurationsResponseDto } from '../companies/dtos/company-configurations.dto';
import { SaasAdminService } from './saas-admin.service';
import { QuerySaasCompaniesDto } from './dtos/query-saas-companies.dto';
import { QuerySaasMerchantsDto } from './dtos/query-saas-merchants.dto';
import { QuerySaasMerchantUsersDto } from './dtos/query-saas-merchant-users.dto';
import { QuerySaasMerchantTerminalsDto } from './dtos/query-saas-merchant-terminals.dto';
import { UpdateSaasCompanyProfileDto } from './dtos/update-saas-company-profile.dto';
import { UpdateSaasMerchantDto } from './dtos/update-saas-merchant.dto';
import {
  SaasCompaniesListResponseDto,
  SaasCompaniesStatsResponseDto,
  SaasCompanyHubResponseDto,
  SaasCompanyProfileResponseDto,
  SaasMerchantHubResponseDto,
  SaasMerchantProfileResponseDto,
  SaasMerchantsListResponseDto,
  SaasMerchantTerminalsResponseDto,
  SaasMerchantUsersResponseDto,
} from './dtos/saas-responses.dto';

const ALL_SCOPES = [
  Scope.ADMIN_PORTAL,
  Scope.MERCHANT_WEB,
  Scope.MERCHANT_ANDROID,
  Scope.MERCHANT_IOS,
  Scope.MERCHANT_CLOVER,
];

/** Reads: platform roles (portal_user included) and merchant_admin (own company only). */
const READ_ROLES = [
  UserRole.PORTAL_ADMIN,
  UserRole.PORTAL_USER,
  UserRole.MERCHANT_ADMIN,
];

/** Writes: portal_user is read-only. super_admin always passes RolesGuard. */
const WRITE_ROLES = [UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN];

const FORBIDDEN = {
  status: 403,
  description:
    'Role not allowed, or the company / merchant belongs to another organization',
  type: ErrorResponse,
};
const COMPANY_NOT_FOUND = {
  status: 404,
  description: 'Company not found',
  type: ErrorResponse,
};
const MERCHANT_NOT_FOUND = {
  status: 404,
  description: 'Merchant not found',
  type: ErrorResponse,
};
const BAD_REQUEST = {
  status: 400,
  description: 'Validation failed',
  type: ErrorResponse,
};

@ApiTags('Platform SaaS - Administration')
@ApiExtraModels(ErrorResponse)
@ApiBearerAuth()
@Controller('v1/saas')
@UseGuards(JwtAuthGuard, RolesGuard)
@Scopes(...ALL_SCOPES)
export class SaasAdminController {
  constructor(private readonly saasAdminService: SaasAdminService) {}

  @Get('companies/stats')
  @Roles(...READ_ROLES)
  @ApiOperation({
    summary:
      'Companies Hub counters (scoped to its company for merchant_admin)',
  })
  @ApiResponse({ status: 200, type: SaasCompaniesStatsResponseDto })
  @ApiResponse(FORBIDDEN)
  getCompaniesStats(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SaasCompaniesStatsResponseDto> {
    return this.saasAdminService.getCompaniesStats(user);
  }

  @Get('companies')
  @Roles(...READ_ROLES)
  @ApiOperation({
    summary:
      'Companies directory with search, status and subscription tier filters',
  })
  @ApiResponse({ status: 200, type: SaasCompaniesListResponseDto })
  @ApiResponse(BAD_REQUEST)
  @ApiResponse(FORBIDDEN)
  findCompanies(
    @Query() query: QuerySaasCompaniesDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SaasCompaniesListResponseDto> {
    return this.saasAdminService.findCompanies(query, user);
  }

  @Get('companies/:id/hub')
  @Roles(...READ_ROLES)
  @ApiOperation({ summary: 'Company hub: company summary and counters' })
  @ApiParam({ name: 'id', type: Number, description: 'Company ID' })
  @ApiResponse({ status: 200, type: SaasCompanyHubResponseDto })
  @ApiResponse(FORBIDDEN)
  @ApiResponse(COMPANY_NOT_FOUND)
  getCompanyHub(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SaasCompanyHubResponseDto> {
    return this.saasAdminService.getCompanyHub(id, user);
  }

  @Get('companies/:id/profile')
  @Roles(...READ_ROLES)
  @ApiOperation({ summary: 'Company profile (legal, fiscal and billing data)' })
  @ApiParam({ name: 'id', type: Number, description: 'Company ID' })
  @ApiResponse({ status: 200, type: SaasCompanyProfileResponseDto })
  @ApiResponse(FORBIDDEN)
  @ApiResponse(COMPANY_NOT_FOUND)
  getCompanyProfile(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SaasCompanyProfileResponseDto> {
    return this.saasAdminService.getCompanyProfile(id, user);
  }

  @Patch('companies/:id/profile')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Partially update a company profile' })
  @ApiParam({ name: 'id', type: Number, description: 'Company ID' })
  @ApiBody({ type: UpdateSaasCompanyProfileDto })
  @ApiResponse({ status: 200, type: SaasCompanyProfileResponseDto })
  @ApiResponse(BAD_REQUEST)
  @ApiResponse(FORBIDDEN)
  @ApiResponse(COMPANY_NOT_FOUND)
  updateCompanyProfile(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSaasCompanyProfileDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SaasCompanyProfileResponseDto> {
    return this.saasAdminService.updateCompanyProfile(id, dto, user);
  }

  @Get('companies/:id/configurations')
  @Roles(...READ_ROLES)
  @ApiOperation({ summary: 'Configuration records of a company' })
  @ApiParam({ name: 'id', type: Number, description: 'Company ID' })
  @ApiResponse({ status: 200, type: CompanyConfigurationsResponseDto })
  @ApiResponse(FORBIDDEN)
  @ApiResponse(COMPANY_NOT_FOUND)
  getCompanyConfigurations(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CompanyConfigurationsResponseDto> {
    return this.saasAdminService.getCompanyConfigurations(id, user);
  }

  @Get('companies/:companyId/merchants')
  @Roles(...READ_ROLES)
  @ApiOperation({
    summary: 'Merchant branches of a company, filtered by search, city, status',
  })
  @ApiParam({ name: 'companyId', type: Number, description: 'Company ID' })
  @ApiResponse({ status: 200, type: SaasMerchantsListResponseDto })
  @ApiResponse(BAD_REQUEST)
  @ApiResponse(FORBIDDEN)
  @ApiResponse(COMPANY_NOT_FOUND)
  findCompanyMerchants(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Query() query: QuerySaasMerchantsDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SaasMerchantsListResponseDto> {
    return this.saasAdminService.findCompanyMerchants(companyId, query, user);
  }

  @Get('merchants/:merchantId')
  @Roles(...READ_ROLES)
  @ApiOperation({ summary: 'Merchant branch profile' })
  @ApiParam({ name: 'merchantId', type: Number, description: 'Merchant ID' })
  @ApiResponse({ status: 200, type: SaasMerchantProfileResponseDto })
  @ApiResponse(FORBIDDEN)
  @ApiResponse(MERCHANT_NOT_FOUND)
  getMerchant(
    @Param('merchantId', ParseIntPipe) merchantId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SaasMerchantProfileResponseDto> {
    return this.saasAdminService.getMerchant(merchantId, user);
  }

  @Patch('merchants/:merchantId')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Partially update a merchant branch profile' })
  @ApiParam({ name: 'merchantId', type: Number, description: 'Merchant ID' })
  @ApiBody({ type: UpdateSaasMerchantDto })
  @ApiResponse({ status: 200, type: SaasMerchantProfileResponseDto })
  @ApiResponse(BAD_REQUEST)
  @ApiResponse(FORBIDDEN)
  @ApiResponse(MERCHANT_NOT_FOUND)
  @ApiResponse({
    status: 409,
    description: 'Another branch of the company already has this name',
    type: ErrorResponse,
  })
  updateMerchant(
    @Param('merchantId', ParseIntPipe) merchantId: number,
    @Body() dto: UpdateSaasMerchantDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SaasMerchantProfileResponseDto> {
    return this.saasAdminService.updateMerchant(merchantId, dto, user);
  }

  @Get('merchants/:merchantId/hub')
  @Roles(...READ_ROLES)
  @ApiOperation({
    summary: 'Merchant hub: terminals, local transactions and users counters',
  })
  @ApiParam({ name: 'merchantId', type: Number, description: 'Merchant ID' })
  @ApiResponse({ status: 200, type: SaasMerchantHubResponseDto })
  @ApiResponse(FORBIDDEN)
  @ApiResponse(MERCHANT_NOT_FOUND)
  getMerchantHub(
    @Param('merchantId', ParseIntPipe) merchantId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SaasMerchantHubResponseDto> {
    return this.saasAdminService.getMerchantHub(merchantId, user);
  }

  @Get('merchants/:merchantId/users')
  @Roles(...READ_ROLES)
  @ApiOperation({ summary: 'Users of a merchant branch (never secrets)' })
  @ApiParam({ name: 'merchantId', type: Number, description: 'Merchant ID' })
  @ApiResponse({ status: 200, type: SaasMerchantUsersResponseDto })
  @ApiResponse(BAD_REQUEST)
  @ApiResponse(FORBIDDEN)
  @ApiResponse(MERCHANT_NOT_FOUND)
  findMerchantUsers(
    @Param('merchantId', ParseIntPipe) merchantId: number,
    @Query() query: QuerySaasMerchantUsersDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SaasMerchantUsersResponseDto> {
    return this.saasAdminService.findMerchantUsers(merchantId, query, user);
  }

  @Get('merchants/:merchantId/terminals')
  @Roles(...READ_ROLES)
  @ApiOperation({
    summary:
      'POS / payment terminals of a merchant branch, filtered by search and status',
  })
  @ApiParam({ name: 'merchantId', type: Number, description: 'Merchant ID' })
  @ApiResponse({ status: 200, type: SaasMerchantTerminalsResponseDto })
  @ApiResponse(BAD_REQUEST)
  @ApiResponse(FORBIDDEN)
  @ApiResponse(MERCHANT_NOT_FOUND)
  findMerchantTerminals(
    @Param('merchantId', ParseIntPipe) merchantId: number,
    @Query() query: QuerySaasMerchantTerminalsDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SaasMerchantTerminalsResponseDto> {
    return this.saasAdminService.findMerchantTerminals(merchantId, query, user);
  }
}
