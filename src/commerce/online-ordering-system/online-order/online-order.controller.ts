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
import { OnlineOrderService } from './online-order.service';
import { OnlineOrderFulfillmentService } from './online-order-fulfillment.service';
import { CreateOnlineOrderDto } from './dto/create-online-order.dto';
import { UpdateOnlineOrderDto } from './dto/update-online-order.dto';
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
import { OneOnlineOrderResponseDto } from './dto/online-order-response.dto';
import { GetOnlineOrderQueryDto } from './dto/get-online-order-query.dto';
import { PaginatedOnlineOrderResponseDto } from './dto/paginated-online-order-response.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { OnlineOrderType } from './constants/online-order-type.enum';
import { OnlineOrderPaymentStatus } from './constants/online-order-payment-status.enum';

type AuthenticatedRequest = ExpressRequest & { user: AuthenticatedUser };

@ApiTags('Online Orders')
@ApiBearerAuth()
@Controller('online-orders')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.ONLINE_ORDERS)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
export class OnlineOrderController {
  constructor(
    private readonly onlineOrderService: OnlineOrderService,
    private readonly onlineOrderFulfillmentService: OnlineOrderFulfillmentService,
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
    summary: 'Create a new Online Order',
    description:
      "Creates a new online order. The online store must belong to the authenticated user's merchant, and the customer must also belong to the same merchant. Only portal administrators and merchant administrators can create online orders.",
  })
  @ApiCreatedResponse({
    description: 'Online order created successfully',
    type: OneOnlineOrderResponseDto,
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
      'Forbidden - You must be associated with a merchant to create online orders',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description:
      'Online store, order, or customer not found or you do not have access to it',
    type: ErrorResponse,
  })
  @ApiBody({
    type: CreateOnlineOrderDto,
    description: 'Online order creation data',
    examples: {
      example1: {
        summary: 'Create online order with delivery type',
        value: {
          storeId: 1,
          customerId: 5,
          type: OnlineOrderType.DELIVERY,
          paymentStatus: OnlineOrderPaymentStatus.PENDING,
          notes: 'Please deliver to the back door',
        },
      },
      example2: {
        summary: 'Create online order with pickup type and scheduled time',
        value: {
          storeId: 1,
          customerId: 5,
          type: OnlineOrderType.PICKUP,
          paymentStatus: OnlineOrderPaymentStatus.PAID,
          scheduledAt: '2024-01-15T10:00:00Z',
        },
      },
      example3: {
        summary: 'Create online order linked to an existing order',
        value: {
          storeId: 1,
          orderId: 10,
          customerId: 5,
          type: OnlineOrderType.DINE_IN,
          paymentStatus: OnlineOrderPaymentStatus.PAID,
          placedAt: '2024-01-15T08:00:00Z',
        },
      },
    },
  })
  async create(
    @Body() dto: CreateOnlineOrderDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<OneOnlineOrderResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.onlineOrderService.create(dto, authenticatedUserMerchantId);
  }

  @Post(':id/accept')
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Accept online order (create POS order and link lines)',
    description:
      'Creates a mirror POS order with source ONLINE, links online_order.order_id and online_order_item.order_item_id, and opens a kitchen order when applicable. Idempotent if already accepted.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Online order ID' })
  @ApiOkResponse({
    description: 'Online order accepted',
    type: OneOnlineOrderResponseDto,
  })
  async accept(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ): Promise<OneOnlineOrderResponseDto> {
    const merchantId = req.user?.merchant?.id;
    return this.onlineOrderFulfillmentService.acceptOnlineOrder(id, merchantId);
  }

  @Post(':id/cancel')
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Cancel online order before POS acceptance',
    description:
      'Only allowed while fulfillment is received and no POS order exists yet.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Online order ID' })
  @ApiOkResponse({
    description: 'Online order cancelled',
    type: OneOnlineOrderResponseDto,
  })
  async cancelFulfillment(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ): Promise<OneOnlineOrderResponseDto> {
    const merchantId = req.user?.merchant?.id;
    return this.onlineOrderFulfillmentService.cancelOnlineOrder(id, merchantId);
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
    summary: 'Get all Online Orders with pagination and filters',
    description:
      "Retrieves a paginated list of online orders for online stores belonging to the authenticated user's merchant. Supports filtering by store ID, order ID, customer ID, type, payment status, placed date, and scheduled date.",
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
    name: 'storeId',
    required: false,
    type: Number,
    description: 'Filter by online store ID',
    example: 1,
  })
  @ApiQuery({
    name: 'orderId',
    required: false,
    type: Number,
    description: 'Filter by order ID',
    example: 10,
  })
  @ApiQuery({
    name: 'customerId',
    required: false,
    type: Number,
    description: 'Filter by customer ID',
    example: 5,
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: OnlineOrderType,
    description: 'Filter by order type',
    example: OnlineOrderType.DELIVERY,
  })
  @ApiQuery({
    name: 'paymentStatus',
    required: false,
    enum: OnlineOrderPaymentStatus,
    description: 'Filter by payment status',
    example: OnlineOrderPaymentStatus.PENDING,
  })
  @ApiQuery({
    name: 'placedDate',
    required: false,
    type: String,
    description: 'Filter by placed date (YYYY-MM-DD format)',
    example: '2024-01-15',
  })
  @ApiQuery({
    name: 'scheduledDate',
    required: false,
    type: String,
    description: 'Filter by scheduled date (YYYY-MM-DD format)',
    example: '2024-01-15',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: [
      'id',
      'merchantId',
      'storeId',
      'orderId',
      'customerId',
      'type',
      'paymentStatus',
      'placedAt',
      'scheduledAt',
      'updatedAt',
    ],
    description: 'Field to sort by',
    example: 'updatedAt',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Sort order',
    example: 'DESC',
  })
  @ApiOkResponse({
    description: 'Paginated list of online orders retrieved successfully',
    type: PaginatedOnlineOrderResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - User must be associated with a merchant to view online orders',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters',
    type: ErrorResponse,
  })
  async findAll(
    @Query() query: GetOnlineOrderQueryDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<PaginatedOnlineOrderResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.onlineOrderService.findAll(query, authenticatedUserMerchantId);
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
    summary: 'Get an Online Order by ID',
    description:
      'Retrieves a specific online order by its ID. Users can only access online orders from online stores belonging to their own merchant.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Online order ID' })
  @ApiOkResponse({
    description: 'Online order found successfully',
    type: OneOnlineOrderResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({
    description:
      'Forbidden - You can only view online orders from your own merchant',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Online order not found',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'Invalid online order ID',
    type: ErrorResponse,
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ): Promise<OneOnlineOrderResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.onlineOrderService.findOne(id, authenticatedUserMerchantId);
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
    summary: 'Update an Online Order by ID',
    description:
      'Updates an existing online order. Users can only update online orders from online stores belonging to their own merchant. All fields are optional.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Online order ID to update',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Online order updated successfully',
    type: OneOnlineOrderResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - You can only update online orders from your own merchant',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Online order not found',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or ID',
    type: ErrorResponse,
  })
  @ApiConflictResponse({
    description: 'Cannot update a deleted online order',
    type: ErrorResponse,
  })
  @ApiBody({
    type: UpdateOnlineOrderDto,
    description: 'Online order update data (all fields optional)',
    examples: {
      example1: {
        summary: 'Update payment status',
        value: {
          paymentStatus: OnlineOrderPaymentStatus.PAID,
        },
      },
      example2: {
        summary: 'Update scheduled time and notes',
        value: {
          scheduledAt: '2024-01-15T11:00:00Z',
          notes: 'Updated delivery instructions',
        },
      },
    },
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOnlineOrderDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<OneOnlineOrderResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.onlineOrderService.update(id, dto, authenticatedUserMerchantId);
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
    summary: 'Delete an Online Order by ID',
    description:
      'Performs a logical deletion of an online order. Users can only delete online orders from online stores belonging to their own merchant.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Online order ID to delete',
  })
  @ApiOkResponse({
    description: 'Online order deleted successfully',
    type: OneOnlineOrderResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({
    description:
      'Forbidden - You can only delete online orders from your own merchant',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Online order not found',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'Invalid online order ID',
    type: ErrorResponse,
  })
  @ApiConflictResponse({
    description: 'Online order is already deleted',
    type: ErrorResponse,
  })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ): Promise<OneOnlineOrderResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.onlineOrderService.remove(id, authenticatedUserMerchantId);
  }
}
