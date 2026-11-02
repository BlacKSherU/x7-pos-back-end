// src/platform-saas/companies/companies.controller.ts
import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Put,
  Patch,
  Delete,
  ParseIntPipe,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiExtraModels,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dtos/create-company.dto';
import { UpdateCompanyDto } from './dtos/update-company.dto';
import { UpdateCompanyProfileDto } from './dtos/update-company-profile.dto';
import { UpdateCompanyStatusDto } from './dtos/update-company-status.dto';
import {
  OneCompanyResponseDto,
  AllCompanyResponseDto,
} from './dtos/company-response.dto';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Scopes } from '../../auth/decorators/scopes.decorator';
import { UserRole } from '../users/constants/role.enum';
import { Scope } from '../users/constants/scope.enum';
import { ErrorResponse } from '../../common/dtos/error-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { CompanyProfileResponseDto } from './dtos/company-profile.dto';
import { CompanyConfigurationsResponseDto } from './dtos/company-configurations.dto';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';

@ApiTags('Platform SaaS - Companies')
@ApiExtraModels(ErrorResponse)
@ApiBearerAuth()
@Controller('companies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Create a new company' })
  @ApiResponse({
    status: 201,
    description: 'Company created successfully',
    type: OneCompanyResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: ['name must be longer than or equal to 2 characters'],
        error: 'Bad Request',
      },
    },
  })
  @ApiBody({ type: CreateCompanyDto })
  create(@Body() dto: CreateCompanyDto): Promise<OneCompanyResponseDto> {
    return this.companiesService.create(dto);
  }

  @Get()
  @Roles(UserRole.PORTAL_ADMIN, UserRole.PORTAL_USER)
  @Scopes(Scope.ADMIN_PORTAL)
  @ApiOperation({ summary: 'Get all companies' })
  @ApiResponse({
    status: 200,
    description: 'List of companies',
    type: AllCompanyResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 500,
        message: 'Internal server error',
        error: 'Internal Server Error',
      },
    },
  })
  findAll(@Query() query: PaginationQueryDto): Promise<AllCompanyResponseDto> {
    return this.companiesService.findAll(query);
  }

  @Get('company/profile')
  @Roles(UserRole.PORTAL_ADMIN, UserRole.PORTAL_USER, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Get the authenticated user company profile' })
  @ApiResponse({
    status: 200,
    description: 'Company profile found',
    type: CompanyProfileResponseDto,
  })
  getProfile(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CompanyProfileResponseDto> {
    return this.companiesService.getProfileForUser(user);
  }

  @Put('company/profile')
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Update the authenticated user company profile' })
  @ApiBody({ type: UpdateCompanyProfileDto })
  @ApiResponse({
    status: 200,
    description: 'Company profile updated',
    type: CompanyProfileResponseDto,
  })
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateCompanyProfileDto,
  ): Promise<CompanyProfileResponseDto> {
    return this.companiesService.updateProfileForUser(user, dto);
  }

  @Get('company/configurations')
  @Roles(UserRole.PORTAL_ADMIN, UserRole.PORTAL_USER, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Get configuration records for the authenticated user company',
  })
  @ApiResponse({
    status: 200,
    description: 'Company configurations found',
    type: CompanyConfigurationsResponseDto,
  })
  getConfigurations(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CompanyConfigurationsResponseDto> {
    return this.companiesService.getConfigurationsForUser(user);
  }

  @Get(':id')
  @Roles(UserRole.PORTAL_ADMIN, UserRole.PORTAL_USER, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Get a company by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Company ID' })
  @ApiResponse({
    status: 200,
    description: 'Company found',
    type: OneCompanyResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Company not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Company not found',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid ID',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'Validation failed (numeric string is expected)',
        error: 'Bad Request',
      },
    },
  })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OneCompanyResponseDto> {
    return this.companiesService.findOne(id, user);
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
  @ApiOperation({ summary: 'Update a company' })
  @ApiParam({ name: 'id', type: Number, description: 'Company ID' })
  @ApiBody({ type: UpdateCompanyDto })
  @ApiResponse({
    status: 200,
    description: 'Company updated',
    type: OneCompanyResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Company not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Company not found',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: ['name must be longer than or equal to 2 characters'],
        error: 'Bad Request',
      },
    },
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCompanyDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OneCompanyResponseDto> {
    return this.companiesService.update(id, dto, user);
  }

  @Patch(':id/status')
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary:
      'Suspend or reactivate a company (non-destructive status toggle instead of DELETE)',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Company ID' })
  @ApiBody({ type: UpdateCompanyStatusDto })
  @ApiResponse({
    status: 200,
    description: 'Company status updated',
    type: OneCompanyResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Company not found',
    type: ErrorResponse,
  })
  setStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCompanyStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OneCompanyResponseDto> {
    return this.companiesService.setStatus(id, dto.status, user);
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
  @ApiOperation({ summary: 'Delete a company' })
  @ApiParam({ name: 'id', type: Number, description: 'Company ID' })
  @ApiResponse({
    status: 200,
    description: 'Company deleted successfully',
    type: OneCompanyResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Company not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Company not found',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid ID',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'Validation failed (numeric string is expected)',
        error: 'Bad Request',
      },
    },
  })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OneCompanyResponseDto> {
    return this.companiesService.remove(id, user);
  }
}
