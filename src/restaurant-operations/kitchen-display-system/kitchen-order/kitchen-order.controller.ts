import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Patch,
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
import { KitchenOrderService } from './kitchen-order.service';
import { CreateKitchenOrderDto } from './dto/create-kitchen-order.dto';
import { UpdateKitchenOrderDto } from './dto/update-kitchen-order.dto';
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
  ApiExtraModels,
} from '@nestjs/swagger';
import { AuthenticatedUser } from '../../../auth/interfaces/authenticated-user.interface';
import { OneKitchenOrderResponseDto } from './dto/kitchen-order-response.dto';
import { GetKitchenOrderQueryDto } from './dto/get-kitchen-order-query.dto';
import { PaginatedKitchenOrderResponseDto } from './dto/paginated-kitchen-order-response.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { KitchenOrderBusinessStatus } from './constants/kitchen-order-business-status.enum';
import { KitchenCancellationReason } from './constants/kitchen-order-cancellation-reason.dto';
import { CancelKitchenOrderDto } from './dto/cancel-kitchen-order.dto';

type AuthenticatedRequest = ExpressRequest & { user: AuthenticatedUser };

@ApiExtraModels(
  ErrorResponse,
  OneKitchenOrderResponseDto,
  PaginatedKitchenOrderResponseDto,
  CreateKitchenOrderDto,
  UpdateKitchenOrderDto,
  CancelKitchenOrderDto,
)
@ApiTags('Restaurant operations - Kitchen Display System - Kitchen Orders')
@ApiBearerAuth()
@Controller('kitchen-orders')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.KITCHEN_ORDERS)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
export class KitchenOrderController {
  constructor(private readonly kitchenOrderService: KitchenOrderService) {}

  @Post()
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Create a new Kitchen Order',
    description:
      "Creates a new kitchen order. Either orderId or onlineOrderId must be provided. The order must belong to the authenticated user's merchant. Only portal administrators and merchant administrators can create kitchen orders.",
  })
  @ApiCreatedResponse({
    description: 'Kitchen order created successfully',
    type: OneKitchenOrderResponseDto,
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
      'Forbidden - You must be associated with a merchant to create kitchen orders',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Merchant, order, online order, or kitchen station not found',
    type: ErrorResponse,
  })
  @ApiBody({
    type: CreateKitchenOrderDto,
    description: 'Kitchen order creation data',
    examples: {
      example1: {
        summary: 'Create kitchen order from regular order',
        value: {
          orderId: 1,
          stationId: 1,
          priority: 1,
          businessStatus: KitchenOrderBusinessStatus.PENDING,
        },
      },
      example2: {
        summary: 'Create kitchen order from online order',
        value: {
          onlineOrderId: 1,
          stationId: 1,
          priority: 2,
        },
      },
    },
  })
  async create(
    @Body() createKitchenOrderDto: CreateKitchenOrderDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.kitchenOrderService.create(
      createKitchenOrderDto,
      authenticatedUserMerchantId,
      req.user?.id,
    );
  }

  @Get()
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Get all Kitchen Orders',
    description:
      "Retrieves a paginated list of kitchen orders. Only returns orders that belong to the authenticated user's merchant. Only portal administrators and merchant administrators can access kitchen orders.",
  })
  @ApiOkResponse({
    description: 'Kitchen orders retrieved successfully',
    type: PaginatedKitchenOrderResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - You must be associated with a merchant to access kitchen orders',
    type: ErrorResponse,
  })
  @ApiQuery({
    name: 'orderId',
    required: false,
    type: Number,
    description: 'Filter by order ID',
  })
  @ApiQuery({
    name: 'onlineOrderId',
    required: false,
    type: Number,
    description: 'Filter by online order ID',
  })
  @ApiQuery({
    name: 'stationId',
    required: false,
    type: Number,
    description: 'Filter by kitchen station ID',
  })
  @ApiQuery({
    name: 'businessStatus',
    required: false,
    enum: KitchenOrderBusinessStatus,
    description: 'Filter by business status',
  })
  @ApiQuery({
    name: 'minPriority',
    required: false,
    type: Number,
    description: 'Filter by minimum priority',
  })
  @ApiQuery({
    name: 'createdDate',
    required: false,
    type: String,
    description: 'Filter by creation date (YYYY-MM-DD format)',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Filter orders created on or after this date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Filter orders created on or before this date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'cancellationReason',
    required: false,
    enum: KitchenCancellationReason,
    description: 'Filter by cancellation reason',
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
      'orderId',
      'onlineOrderId',
      'stationId',
      'priority',
      'businessStatus',
      'startedAt',
      'completedAt',
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
    @Query() query: GetKitchenOrderQueryDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.kitchenOrderService.findAll(query, authenticatedUserMerchantId);
  }

  @Get(':id')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Get a single Kitchen Order by ID',
    description:
      "Retrieves a single kitchen order by its ID. The order must belong to the authenticated user's merchant. Only portal administrators and merchant administrators can access kitchen orders.",
  })
  @ApiOkResponse({
    description: 'Kitchen order retrieved successfully',
    type: OneKitchenOrderResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - You must be associated with a merchant to access kitchen orders',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Kitchen order not found',
    type: ErrorResponse,
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Kitchen order ID',
    example: 1,
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.kitchenOrderService.findOne(id, authenticatedUserMerchantId);
  }

  @Put(':id')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Update a Kitchen Order',
    description:
      "Updates an existing kitchen order. The order must belong to the authenticated user's merchant. Only portal administrators and merchant administrators can update kitchen orders.",
  })
  @ApiOkResponse({
    description: 'Kitchen order updated successfully',
    type: OneKitchenOrderResponseDto,
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
      'Forbidden - You must be associated with a merchant to update kitchen orders',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description:
      'Kitchen order, order, online order, or kitchen station not found',
    type: ErrorResponse,
  })
  @ApiConflictResponse({
    description: 'Conflict - Cannot update a deleted kitchen order',
    type: ErrorResponse,
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Kitchen order ID',
    example: 1,
  })
  @ApiBody({
    type: UpdateKitchenOrderDto,
    description: 'Kitchen order update data',
    examples: {
      example1: {
        summary: 'Update business status to started',
        value: {
          businessStatus: KitchenOrderBusinessStatus.STARTED,
        },
      },
      example2: {
        summary: 'Update priority and notes',
        value: {
          priority: 5,
          notes: 'Rush order - VIP customer',
        },
      },
    },
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateKitchenOrderDto: UpdateKitchenOrderDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.kitchenOrderService.update(
      id,
      updateKitchenOrderDto,
      authenticatedUserMerchantId,
      req.user?.id,
    );
  }

  @Delete(':id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a Kitchen Order',
    description:
      "Performs a logical deletion of a kitchen order. The order must belong to the authenticated user's merchant. Only portal administrators and merchant administrators can delete kitchen orders.",
  })
  @ApiOkResponse({
    description: 'Kitchen order deleted successfully',
    type: OneKitchenOrderResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - You must be associated with a merchant to delete kitchen orders',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Kitchen order not found',
    type: ErrorResponse,
  })
  @ApiConflictResponse({
    description: 'Conflict - Kitchen order is already deleted',
    type: ErrorResponse,
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Kitchen order ID',
    example: 1,
  })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.kitchenOrderService.remove(id, authenticatedUserMerchantId);
  }

  @Patch(':id/cancel')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Cancel a Kitchen Order',
    description:
      'Cancels an active kitchen order with a specified cancellation reason, optional stock adjustment action, and notes.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Unique identifier of the Kitchen Order to cancel',
    example: 42,
  })
  @ApiBody({
    type: CancelKitchenOrderDto,
    description: 'Kitchen order cancellation request payload',
    examples: {
      default: {
        summary: 'Cancel kitchen order request',
        value: {
          reason: 'CUSTOMER_CANCELLED',
          stockAction: 'RESTOCK',
          notes:
            'Customer requested cancellation before food preparation started',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Kitchen order cancelled successfully',
    type: OneKitchenOrderResponseDto,
    schema: {
      example: {
        statusCode: 200,
        message: 'Kitchen order cancelled successfully',
        data: {
          id: 42,
          merchantId: 10,
          orderId: 101,
          onlineOrderId: null,
          stationId: 2,
          priority: 1,
          businessStatus: 'CANCELLED',
          startedAt: '2026-09-30T14:00:00.000Z',
          completedAt: null,
          cancelledAt: '2026-09-30T14:25:00.000Z',
          cancellationReason: 'CUSTOMER_CANCELLED',
          cancelledByUserId: 5,
          notes:
            'Customer requested cancellation before food preparation started',
          status: 'ACTIVE',
          createdAt: '2026-09-30T13:55:00.000Z',
          updatedAt: '2026-09-30T14:25:00.000Z',
          merchant: {
            id: 10,
            name: 'Central Restaurant',
          },
          order: {
            id: 101,
            status: 'cancelled',
          },
          onlineOrder: null,
          station: {
            id: 2,
            name: 'Main Kitchen',
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      'Bad Request - Invalid cancellation parameters or order is already completed/cancelled',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'Kitchen order is already cancelled or completed',
        error: 'Bad Request',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Missing or invalid authentication token',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - Insufficient permissions to cancel kitchen orders',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Kitchen order not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Kitchen order with ID 42 not found',
        error: 'Not Found',
      },
    },
  })
  async cancelKitchenOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelKitchenOrderDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.kitchenOrderService.cancelKitchenOrder(id, dto, req.user);
  }

  @Post(':id/recall')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary:
      'Recall a bumped/completed kitchen order back to active status (Story X7P-4209)',
    description:
      'Reverts a completed order back to started status, preserving original started_at timestamp, resetting items to in_preparation, and logging an audit event.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Kitchen order ID to recall',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Kitchen order recalled successfully',
    type: OneKitchenOrderResponseDto,
  })
  async recallKitchenOrder(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    const userId = req.user?.id;
    return this.kitchenOrderService.recallKitchenOrder(
      id,
      authenticatedUserMerchantId,
      userId,
    );
  }
}
