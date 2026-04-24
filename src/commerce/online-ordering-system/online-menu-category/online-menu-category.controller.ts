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
import { OnlineMenuCategoryService } from './online-menu-category.service';
import { CreateOnlineMenuCategoryDto } from './dto/create-online-menu-category.dto';
import { UpdateOnlineMenuCategoryDto } from './dto/update-online-menu-category.dto';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiBody,
  ApiForbiddenResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { OneOnlineMenuCategoryResponseDto } from './dto/online-menu-category-response.dto';
import { GetOnlineMenuCategoryQueryDto } from './dto/get-online-menu-category-query.dto';
import { PaginatedOnlineMenuCategoryResponseDto } from './dto/paginated-online-menu-category-response.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';

type AuthenticatedRequest = ExpressRequest & { user: AuthenticatedUser };

@ApiTags('Online Menu Categories')
@ApiBearerAuth()
@Controller('online-menu-categories')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.ONLINE_MENU_CATEGORIES)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
export class OnlineMenuCategoryController {
  constructor(
    private readonly onlineMenuCategoryService: OnlineMenuCategoryService,
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
  @ApiOperation({
    summary: 'Create a new Online Menu Category',
    description:
      "Creates a new association between an online menu and a category from product inventory. The online menu must belong to the authenticated user's merchant, and the category must also belong to the same merchant. Only portal administrators and merchant administrators can create online menu categories.",
  })
  @ApiCreatedResponse({
    description: 'Online menu category created successfully',
    type: OneOnlineMenuCategoryResponseDto,
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
      'Forbidden - You must be associated with a merchant to create online menu categories',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description:
      'Online menu or category not found or you do not have access to it',
    type: ErrorResponse,
  })
  @ApiBody({
    type: CreateOnlineMenuCategoryDto,
    description: 'Online menu category creation data',
    examples: {
      example1: {
        summary: 'Create online menu category',
        value: {
          menuId: 1,
          categoryId: 5,
          displayOrder: 1,
        },
      },
      example2: {
        summary: 'Create online menu category with different display order',
        value: {
          menuId: 1,
          categoryId: 3,
          displayOrder: 2,
        },
      },
    },
  })
  async create(
    @Body() dto: CreateOnlineMenuCategoryDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<OneOnlineMenuCategoryResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.onlineMenuCategoryService.create(
      dto,
      authenticatedUserMerchantId,
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
  @ApiOperation({
    summary: 'Get all Online Menu Categories with pagination and filters',
    description:
      "Retrieves a paginated list of online menu categories for online menus belonging to the authenticated user's merchant. Supports filtering by menu ID, category ID, and creation date.",
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
    name: 'menuId',
    required: false,
    type: Number,
    description: 'Filter by menu ID',
    example: 1,
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    type: Number,
    description: 'Filter by category ID',
    example: 5,
  })
  @ApiQuery({
    name: 'createdDate',
    required: false,
    type: String,
    description: 'Filter by creation date (YYYY-MM-DD format)',
    example: '2024-01-15',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: [
      'id',
      'menuId',
      'categoryId',
      'displayOrder',
      'createdAt',
      'updatedAt',
    ],
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
    description:
      'Paginated list of online menu categories retrieved successfully',
    type: PaginatedOnlineMenuCategoryResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - User must be associated with a merchant to view online menu categories',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters',
    type: ErrorResponse,
  })
  async findAll(
    @Query() query: GetOnlineMenuCategoryQueryDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<PaginatedOnlineMenuCategoryResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.onlineMenuCategoryService.findAll(
      query,
      authenticatedUserMerchantId,
    );
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
    summary: 'Get an Online Menu Category by ID',
    description:
      'Retrieves a specific online menu category by its ID. Users can only access online menu categories from online menus belonging to their own merchant.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Online menu category ID',
  })
  @ApiOkResponse({
    description: 'Online menu category found successfully',
    type: OneOnlineMenuCategoryResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({
    description:
      'Forbidden - You can only view online menu categories from your own merchant',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Online menu category not found',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'Invalid online menu category ID',
    type: ErrorResponse,
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ): Promise<OneOnlineMenuCategoryResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.onlineMenuCategoryService.findOne(
      id,
      authenticatedUserMerchantId,
    );
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
    summary: 'Update an Online Menu Category by ID',
    description:
      'Updates an existing online menu category. Users can only update online menu categories from online menus belonging to their own merchant. All fields are optional.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Online menu category ID to update',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Online menu category updated successfully',
    type: OneOnlineMenuCategoryResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - You can only update online menu categories from your own merchant',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Online menu category not found',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or ID',
    type: ErrorResponse,
  })
  @ApiBody({
    type: UpdateOnlineMenuCategoryDto,
    description: 'Online menu category update data (all fields optional)',
    examples: {
      example1: {
        summary: 'Update display order',
        value: {
          displayOrder: 3,
        },
      },
      example2: {
        summary: 'Update menu and category',
        value: {
          menuId: 2,
          categoryId: 7,
          displayOrder: 1,
        },
      },
    },
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOnlineMenuCategoryDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<OneOnlineMenuCategoryResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.onlineMenuCategoryService.update(
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
    summary: 'Delete an Online Menu Category by ID',
    description:
      'Permanently deletes an online menu category. Users can only delete online menu categories from online menus belonging to their own merchant.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Online menu category ID to delete',
  })
  @ApiOkResponse({
    description: 'Online menu category deleted successfully',
    type: OneOnlineMenuCategoryResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({
    description:
      'Forbidden - You can only delete online menu categories from your own merchant',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Online menu category not found',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'Invalid online menu category ID',
    type: ErrorResponse,
  })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ): Promise<OneOnlineMenuCategoryResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.onlineMenuCategoryService.remove(
      id,
      authenticatedUserMerchantId,
    );
  }
}
