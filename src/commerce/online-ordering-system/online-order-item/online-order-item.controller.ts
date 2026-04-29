import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { FeatureAccessGuard } from 'src/auth/guards/feature-access.guard';
import { RequireFeature } from 'src/auth/decorators/require-feature.decorator';
import { SUBSCRIPTION_FEATURE_IDS } from 'src/common/subscription/subscription-feature-ids';

import { Request as ExpressRequest } from 'express';
import { OnlineOrderItemService } from './online-order-item.service';
import { CreateOnlineOrderItemDto } from './dto/create-online-order-item.dto';
import { UpdateOnlineOrderItemDto } from './dto/update-online-order-item.dto';
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
  ApiConflictResponse,
} from '@nestjs/swagger';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { OneOnlineOrderItemResponseDto } from './dto/online-order-item-response.dto';

type AuthenticatedRequest = ExpressRequest & { user: AuthenticatedUser };
import { GetOnlineOrderItemQueryDto } from './dto/get-online-order-item-query.dto';
import { PaginatedOnlineOrderItemResponseDto } from './dto/paginated-online-order-item-response.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';

@ApiTags('Online Order Items')
@ApiBearerAuth()
@Controller('online-order-items')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.ONLINE_ORDER_ITEMS)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
export class OnlineOrderItemController {
  constructor(
    private readonly onlineOrderItemService: OnlineOrderItemService,
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
    summary: 'Create a new Online Order Item',
    description:
      "Creates a new online order item. The online order must belong to the authenticated user's merchant, and the product/variant must also belong to the same merchant. Only portal administrators and merchant administrators can create online order items.",
  })
  @ApiCreatedResponse({
    description: 'Online order item created successfully',
    type: OneOnlineOrderItemResponseDto,
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
      'Forbidden - You must be associated with a merchant to create online order items',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description:
      'Online order, product, or variant not found or you do not have access to it',
    type: ErrorResponse,
  })
  @ApiBody({
    type: CreateOnlineOrderItemDto,
    description: 'Online order item creation data',
    examples: {
      example1: {
        summary: 'Create online order item with product only',
        value: {
          onlineOrderId: 1,
          productId: 5,
          quantity: 2,
          notes: 'Extra sauce on the side',
        },
      },
      example2: {
        summary: 'Create online order item with product and variant',
        value: {
          onlineOrderId: 1,
          productId: 5,
          variantId: 3,
          quantity: 1,
          modifiers: { extraSauce: true, size: 'large' },
          notes: 'Please make it spicy',
        },
      },
    },
  })
  async create(
    @Body() createOnlineOrderItemDto: CreateOnlineOrderItemDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.onlineOrderItemService.create(
      createOnlineOrderItemDto,
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
    summary: 'Get all Online Order Items',
    description:
      "Retrieves a paginated list of online order items. Only returns items from online orders that belong to the authenticated user's merchant. Only portal administrators and merchant administrators can access online order items.",
  })
  @ApiOkResponse({
    description: 'Online order items retrieved successfully',
    type: PaginatedOnlineOrderItemResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - You must be associated with a merchant to access online order items',
    type: ErrorResponse,
  })
  @ApiQuery({
    name: 'onlineOrderId',
    required: false,
    type: Number,
    description: 'Filter by online order ID',
  })
  @ApiQuery({
    name: 'productId',
    required: false,
    type: Number,
    description: 'Filter by product ID',
  })
  @ApiQuery({
    name: 'variantId',
    required: false,
    type: Number,
    description: 'Filter by variant ID',
  })
  @ApiQuery({
    name: 'createdDate',
    required: false,
    type: String,
    description: 'Filter by creation date (YYYY-MM-DD format)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination (minimum 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (minimum 1, maximum 100)',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: [
      'id',
      'onlineOrderId',
      'productId',
      'variantId',
      'quantity',
      'createdAt',
      'updatedAt',
    ],
    description: 'Field to sort by',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Sort order (ASC or DESC)',
  })
  async findAll(
    @Query() query: GetOnlineOrderItemQueryDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.onlineOrderItemService.findAll(
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
    summary: 'Get a single Online Order Item by ID',
    description:
      "Retrieves a single online order item by its ID. The item must belong to an online order that belongs to the authenticated user's merchant. Only portal administrators and merchant administrators can access online order items.",
  })
  @ApiOkResponse({
    description: 'Online order item retrieved successfully',
    type: OneOnlineOrderItemResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - You must be associated with a merchant to access online order items',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Online order item not found',
    type: ErrorResponse,
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Online order item ID',
    example: 1,
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.onlineOrderItemService.findOne(id, authenticatedUserMerchantId);
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
    summary: 'Update an Online Order Item',
    description:
      "Updates an existing online order item. The item must belong to an online order that belongs to the authenticated user's merchant. Only portal administrators and merchant administrators can update online order items.",
  })
  @ApiOkResponse({
    description: 'Online order item updated successfully',
    type: OneOnlineOrderItemResponseDto,
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
      'Forbidden - You must be associated with a merchant to update online order items',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description:
      'Online order item, online order, product, or variant not found',
    type: ErrorResponse,
  })
  @ApiConflictResponse({
    description: 'Conflict - Cannot update a deleted online order item',
    type: ErrorResponse,
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Online order item ID',
    example: 1,
  })
  @ApiBody({
    type: UpdateOnlineOrderItemDto,
    description: 'Online order item update data',
    examples: {
      example1: {
        summary: 'Update quantity',
        value: {
          quantity: 3,
        },
      },
      example2: {
        summary: 'Update modifiers and notes',
        value: {
          modifiers: { extraSauce: false, size: 'medium' },
          notes: 'No extra sauce please',
        },
      },
    },
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOnlineOrderItemDto: UpdateOnlineOrderItemDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.onlineOrderItemService.update(
      id,
      updateOnlineOrderItemDto,
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
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete an Online Order Item',
    description:
      "Performs a logical deletion of an online order item. The item must belong to an online order that belongs to the authenticated user's merchant. Only portal administrators and merchant administrators can delete online order items.",
  })
  @ApiOkResponse({
    description: 'Online order item deleted successfully',
    type: OneOnlineOrderItemResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - You must be associated with a merchant to delete online order items',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Online order item not found',
    type: ErrorResponse,
  })
  @ApiConflictResponse({
    description: 'Conflict - Online order item is already deleted',
    type: ErrorResponse,
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Online order item ID',
    example: 1,
  })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.onlineOrderItemService.remove(id, authenticatedUserMerchantId);
  }
}
