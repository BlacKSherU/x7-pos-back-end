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
  Request,
  Query,
} from '@nestjs/common';
import { FeatureAccessGuard } from 'src/auth/guards/feature-access.guard';
import { RequireFeature } from 'src/auth/decorators/require-feature.decorator';
import { SUBSCRIPTION_FEATURE_IDS } from 'src/common/subscription/subscription-feature-ids';

import { Request as ExpressRequest } from 'express';
import { OnlineStoresService } from './online-stores.service';
import { CreateOnlineStoreDto } from './dto/create-online-store.dto';
import { UpdateOnlineStoreDto } from './dto/update-online-store.dto';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiBody,
  ApiForbiddenResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { OneOnlineStoreResponseDto } from './dto/online-store-response.dto';

type AuthenticatedRequest = ExpressRequest & { user: AuthenticatedUser };
import { GetOnlineStoreQueryDto } from './dto/get-online-store-query.dto';
import { PaginatedOnlineStoreResponseDto } from './dto/paginated-online-store-response.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { OnlineStoreStatus } from './constants/online-store-status.enum';

@ApiTags('Online Stores')
@ApiBearerAuth()
@Controller('online-stores')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.ONLINE_STORES)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
export class OnlineStoresController {
  constructor(private readonly onlineStoresService: OnlineStoresService) {}

  @Post()
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Create a new Online Store',
    description:
      "Creates a new online store for the authenticated user's merchant. Only portal administrators and merchant administrators can create online stores.",
  })
  @ApiCreatedResponse({
    description: 'Online store created successfully',
    type: OneOnlineStoreResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or validation errors',
    type: ErrorResponse,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - You must be associated with a merchant to create online stores',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Merchant not found',
    type: ErrorResponse,
  })
  @ApiConflictResponse({
    description:
      'Conflict - An online store with the same subdomain already exists for this merchant',
    type: ErrorResponse,
  })
  @ApiBody({
    type: CreateOnlineStoreDto,
    description: 'Online store creation data',
    examples: {
      example1: {
        summary: 'Create online store',
        value: {
          subdomain: 'my-store',
          theme: 'default',
          currency: 'USD',
          timezone: 'America/New_York',
        },
      },
      example2: {
        summary: 'Create online store with custom theme',
        value: {
          subdomain: 'restaurant-abc',
          theme: 'modern',
          currency: 'EUR',
          timezone: 'Europe/Madrid',
        },
      },
    },
  })
  async create(
    @Body() dto: CreateOnlineStoreDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<OneOnlineStoreResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.onlineStoresService.create(dto, authenticatedUserMerchantId);
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
  @ApiOperation({
    summary: 'Get all Online Stores with pagination and filters',
    description:
      "Retrieves a paginated list of online stores for the authenticated user's merchant. Supports filtering by subdomain, theme, currency, active status, and creation date.",
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination (minimum 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (1-100)',
    example: 10,
  })
  @ApiQuery({
    name: 'subdomain',
    required: false,
    type: String,
    description: 'Filter by subdomain (partial match)',
    example: 'my-store',
  })
  @ApiQuery({
    name: 'theme',
    required: false,
    type: String,
    description: 'Filter by theme',
    example: 'default',
  })
  @ApiQuery({
    name: 'currency',
    required: false,
    type: String,
    description: 'Filter by currency code',
    example: 'USD',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filter by active status',
    example: true,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: OnlineStoreStatus,
    description: 'Filter by status (active, deleted)',
    example: OnlineStoreStatus.ACTIVE,
  })
  @ApiQuery({
    name: 'createdDate',
    required: false,
    type: String,
    description: 'Filter by creation date (YYYY-MM-DD format)',
    example: '2023-10-01',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['subdomain', 'theme', 'createdAt', 'updatedAt'],
    description: 'Field to sort by',
    example: 'createdAt',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Sort order',
    example: 'DESC',
  })
  @ApiOkResponse({
    description: 'Paginated list of online stores retrieved successfully',
    type: PaginatedOnlineStoreResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - User must be associated with a merchant to view online stores',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters',
    type: ErrorResponse,
  })
  async findAll(
    @Query() query: GetOnlineStoreQueryDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<PaginatedOnlineStoreResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.onlineStoresService.findAll(query, authenticatedUserMerchantId);
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
  @ApiOperation({
    summary: 'Get an Online Store by ID',
    description:
      'Retrieves a specific online store by its ID. Users can only access online stores from their own merchant.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Online store ID' })
  @ApiOkResponse({
    description: 'Online store found successfully',
    type: OneOnlineStoreResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({
    description:
      'Forbidden - You can only view online stores from your own merchant',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Online store not found',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'Invalid online store ID',
    type: ErrorResponse,
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ): Promise<OneOnlineStoreResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.onlineStoresService.findOne(id, authenticatedUserMerchantId);
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
  @ApiOperation({
    summary: 'Update an Online Store by ID',
    description:
      "Updates an existing online store for the authenticated user's merchant. Only portal administrators and merchant administrators can update online stores. All fields are optional.",
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Online store ID to update',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Online store updated successfully',
    type: OneOnlineStoreResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - You can only update online stores from your own merchant',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Online store not found',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or ID',
    type: ErrorResponse,
  })
  @ApiConflictResponse({
    description:
      'Conflict - An online store with the same subdomain already exists for this merchant',
    type: ErrorResponse,
  })
  @ApiBody({
    type: UpdateOnlineStoreDto,
    description: 'Online store update data (all fields optional)',
    examples: {
      example1: {
        summary: 'Update subdomain and theme',
        value: {
          subdomain: 'my-store-updated',
          theme: 'modern',
        },
      },
      example2: {
        summary: 'Update active status',
        value: {
          isActive: false,
        },
      },
    },
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOnlineStoreDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<OneOnlineStoreResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.onlineStoresService.update(
      id,
      dto,
      authenticatedUserMerchantId,
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
    summary: 'Soft delete an Online Store by ID',
    description:
      'Performs a soft delete by changing the online store status to "deleted". Only merchant administrators can delete online stores from their own merchant.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Online store ID to delete',
  })
  @ApiOkResponse({
    description: 'Online store soft deleted successfully',
    type: OneOnlineStoreResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({
    description:
      'Forbidden - You can only delete online stores from your own merchant',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Online store not found',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'Invalid online store ID',
    type: ErrorResponse,
  })
  @ApiConflictResponse({
    description: 'Online store is already deleted',
    type: ErrorResponse,
  })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ): Promise<OneOnlineStoreResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.onlineStoresService.remove(id, authenticatedUserMerchantId);
  }
}
