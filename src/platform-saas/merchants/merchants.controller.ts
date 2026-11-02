// src/platform-saas/merchants/merchants.controller.ts
import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Put,
  Delete,
  ParseIntPipe,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiExtraModels,
} from '@nestjs/swagger';
import { MerchantsService } from './merchants.service';
import { CreateMerchantDto } from './dtos/create-merchant.dto';
import { CreateCompanyMerchantDto } from './dtos/create-company-merchant.dto';
import { UpdateMerchantDto } from './dtos/update-merchant.dto';
import {
  OneMerchantResponseDto,
  AllMerchantsResponseDto,
  CompanyMerchantsListResponseDto,
} from './dtos/merchant-response.dto';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Scopes } from '../../auth/decorators/scopes.decorator';
import { UserRole } from '../users/constants/role.enum';
import { Scope } from '../users/constants/scope.enum';
import { ErrorResponse } from '../../common/dtos/error-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { MerchantAdminSummaryResponseDto } from './dtos/merchant-admin-summary.dto';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';

@ApiTags('Platform SaaS - Merchants')
@ApiExtraModels(ErrorResponse)
@ApiBearerAuth()
@Controller('merchants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MerchantsController {
  constructor(private readonly merchantsService: MerchantsService) {}

  @Post()
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Create a new Merchant' })
  @ApiCreatedResponse({
    description: 'Merchant created successfully',
    type: OneMerchantResponseDto,
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
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({ description: 'Email already exists' })
  @ApiBody({ type: CreateMerchantDto })
  create(@Body() dto: CreateMerchantDto): Promise<OneMerchantResponseDto> {
    return this.merchantsService.create(dto);
  }

  @Get()
  @Roles(UserRole.PORTAL_ADMIN, UserRole.PORTAL_USER)
  @Scopes(Scope.ADMIN_PORTAL)
  @ApiOperation({ summary: 'Get all merchants' })
  @ApiOkResponse({
    description: 'List of all merchants',
    type: AllMerchantsResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'No merchants found' })
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
  findAll(
    @Query() query: PaginationQueryDto,
  ): Promise<AllMerchantsResponseDto> {
    return this.merchantsService.findAll(query);
  }

  @Get('company/branches')
  @Roles(UserRole.PORTAL_ADMIN, UserRole.PORTAL_USER, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'List merchants for the authenticated user company',
  })
  @ApiOkResponse({
    description: 'Company merchants retrieved successfully',
    type: CompanyMerchantsListResponseDto,
  })
  findByCompany(
    @CurrentUser() user: AuthenticatedUser,
    @Query('companyId') companyId?: string,
  ): Promise<CompanyMerchantsListResponseDto> {
    const parsedCompanyId =
      companyId !== undefined && companyId !== ''
        ? parseInt(companyId, 10)
        : undefined;
    return this.merchantsService.findByCompanyForUser(user, parsedCompanyId);
  }

  @Post('company/branches')
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Create a merchant branch for the authenticated user company',
  })
  @ApiCreatedResponse({
    description: 'Merchant created successfully',
    type: OneMerchantResponseDto,
  })
  @ApiBody({ type: CreateCompanyMerchantDto })
  createBranch(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCompanyMerchantDto,
  ): Promise<OneMerchantResponseDto> {
    return this.merchantsService.createForCompany(dto, user);
  }

  @Get(':id/admin-summary')
  @Roles(UserRole.PORTAL_ADMIN, UserRole.PORTAL_USER, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Get administrative summary metrics for a merchant branch',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Merchant ID' })
  @ApiOkResponse({
    description: 'Merchant admin summary found',
    type: MerchantAdminSummaryResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Merchant not found' })
  getAdminSummary(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MerchantAdminSummaryResponseDto> {
    return this.merchantsService.getAdminSummary(id, user);
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
  @ApiOperation({ summary: 'Get a Merchant by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Merchant ID' })
  @ApiOkResponse({
    description: 'Merchant found',
    type: OneMerchantResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Merchant not found' })
  @ApiResponse({
    status: 404,
    description: 'Merchant not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Merchant not found',
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
  ): Promise<OneMerchantResponseDto> {
    return this.merchantsService.findOne(id, user);
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
  @ApiOperation({ summary: 'Update a Merchant' })
  @ApiParam({ name: 'id', type: Number, description: 'Merchant ID' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiBody({ type: UpdateMerchantDto })
  @ApiOkResponse({
    description: 'Merchant updated successfully',
    type: OneMerchantResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Merchant not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Merchant not found',
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
    @Body() dto: UpdateMerchantDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OneMerchantResponseDto> {
    return this.merchantsService.update(id, dto, user);
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
  @ApiOperation({ summary: 'Delete a Merchant' })
  @ApiParam({ name: 'id', type: Number, description: 'Merchant ID' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Merchant not found' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiOkResponse({
    description: 'Merchant deleted successfully',
    type: OneMerchantResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Merchant not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Merchant not found',
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
  ): Promise<OneMerchantResponseDto> {
    return this.merchantsService.remove(id, user);
  }
}
