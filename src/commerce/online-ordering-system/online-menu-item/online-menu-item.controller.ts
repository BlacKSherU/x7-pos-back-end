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
import { OnlineMenuItemService } from './online-menu-item.service';
import { CreateOnlineMenuItemDto } from './dto/create-online-menu-item.dto';
import { UpdateOnlineMenuItemDto } from './dto/update-online-menu-item.dto';
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
import { OneOnlineMenuItemResponseDto } from './dto/online-menu-item-response.dto';

type AuthenticatedRequest = ExpressRequest & { user: AuthenticatedUser };
import { GetOnlineMenuItemQueryDto } from './dto/get-online-menu-item-query.dto';
import { PaginatedOnlineMenuItemResponseDto } from './dto/paginated-online-menu-item-response.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';

@ApiTags('Online Menu Items')
@ApiBearerAuth()
@Controller('online-menu-items')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.ONLINE_MENU_ITEMS)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
export class OnlineMenuItemController {
  constructor(private readonly onlineMenuItemService: OnlineMenuItemService) {}

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
    summary: 'Create a new Online Menu Item',
    description:
      "Creates a new association between an online menu and a product (optionally with a variant) from product inventory. The online menu must belong to the authenticated user's merchant, and the product (and variant if provided) must also belong to the same merchant. Only portal administrators and merchant administrators can create online menu items.",
  })
  @ApiCreatedResponse({
    description: 'Online menu item created successfully',
    type: OneOnlineMenuItemResponseDto,
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
      'Forbidden - You must be associated with a merchant to create online menu items',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description:
      'Online menu, product, or variant not found or you do not have access to it',
    type: ErrorResponse,
  })
  @ApiBody({
    type: CreateOnlineMenuItemDto,
    description: 'Online menu item creation data',
    examples: {
      example1: {
        summary: 'Create online menu item with product only (no variant)',
        value: {
          menuId: 1,
          productId: 5,
          displayOrder: 1,
        },
      },
      example2: {
        summary: 'Create online menu item with product and variant',
        value: {
          menuId: 1,
          productId: 5,
          variantId: 3,
          priceOverride: 15.99,
          displayOrder: 2,
        },
      },
      example3: {
        summary:
          'Create online menu item with product, variant and custom availability',
        value: {
          menuId: 1,
          productId: 5,
          variantId: 3,
          isAvailable: false,
          priceOverride: 15.99,
          displayOrder: 2,
        },
      },
    },
  })
  async create(
    @Body() dto: CreateOnlineMenuItemDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<OneOnlineMenuItemResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.onlineMenuItemService.create(dto, authenticatedUserMerchantId);
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
    summary: 'Get all Online Menu Items with pagination and filters',
    description:
      "Retrieves a paginated list of online menu items for online menus belonging to the authenticated user's merchant. Supports filtering by menu ID, product ID, variant ID, availability status, and creation date.",
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
    name: 'productId',
    required: false,
    type: Number,
    description: 'Filter by product ID',
    example: 5,
  })
  @ApiQuery({
    name: 'variantId',
    required: false,
    type: Number,
    description: 'Filter by variant ID',
    example: 3,
  })
  @ApiQuery({
    name: 'isAvailable',
    required: false,
    type: Boolean,
    description: 'Filter by availability status',
    example: true,
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
      'productId',
      'variantId',
      'isAvailable',
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
    description: 'Paginated list of online menu items retrieved successfully',
    type: PaginatedOnlineMenuItemResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - User must be associated with a merchant to view online menu items',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters',
    type: ErrorResponse,
  })
  async findAll(
    @Query() query: GetOnlineMenuItemQueryDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<PaginatedOnlineMenuItemResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.onlineMenuItemService.findAll(
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
    summary: 'Get an Online Menu Item by ID',
    description:
      'Retrieves a specific online menu item by its ID. Users can only access online menu items from online menus belonging to their own merchant.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Online menu item ID' })
  @ApiOkResponse({
    description: 'Online menu item found successfully',
    type: OneOnlineMenuItemResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({
    description:
      'Forbidden - You can only view online menu items from your own merchant',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Online menu item not found',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'Invalid online menu item ID',
    type: ErrorResponse,
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ): Promise<OneOnlineMenuItemResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.onlineMenuItemService.findOne(id, authenticatedUserMerchantId);
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
    summary: 'Update an Online Menu Item by ID',
    description:
      'Updates an existing online menu item. Users can only update online menu items from online menus belonging to their own merchant. All fields are optional.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Online menu item ID to update',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Online menu item updated successfully',
    type: OneOnlineMenuItemResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - You can only update online menu items from your own merchant',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Online menu item not found',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or ID',
    type: ErrorResponse,
  })
  @ApiBody({
    type: UpdateOnlineMenuItemDto,
    description: 'Online menu item update data (all fields optional)',
    examples: {
      example1: {
        summary: 'Update availability and price override',
        value: {
          isAvailable: false,
          priceOverride: 18.99,
        },
      },
      example2: {
        summary: 'Update display order',
        value: {
          displayOrder: 3,
        },
      },
    },
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOnlineMenuItemDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<OneOnlineMenuItemResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.onlineMenuItemService.update(
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
    summary: 'Delete an Online Menu Item by ID',
    description:
      'Permanently deletes an online menu item. Users can only delete online menu items from online menus belonging to their own merchant.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Online menu item ID to delete',
  })
  @ApiOkResponse({
    description: 'Online menu item deleted successfully',
    type: OneOnlineMenuItemResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({
    description:
      'Forbidden - You can only delete online menu items from your own merchant',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Online menu item not found',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'Invalid online menu item ID',
    type: ErrorResponse,
  })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ): Promise<OneOnlineMenuItemResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.onlineMenuItemService.remove(id, authenticatedUserMerchantId);
  }
}
