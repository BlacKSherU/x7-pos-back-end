import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Query,
  Request,
  ParseIntPipe,
  Put,
} from '@nestjs/common';
import { FeatureAccessGuard } from 'src/auth/guards/feature-access.guard';
import { RequireFeature } from 'src/auth/decorators/require-feature.decorator';
import { SUBSCRIPTION_FEATURE_IDS } from 'src/common/subscription/subscription-feature-ids';

import { Request as ExpressRequest } from 'express';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { Scopes } from '../../../auth/decorators/scopes.decorator';
import { UserRole } from '../../../platform-saas/users/constants/role.enum';
import { Scope } from '../../../platform-saas/users/constants/scope.enum';
import {
  OneOrderResponseDto,
  PaginatedOrdersResponseDto,
} from './dto/order-response.dto';
import { GetOrdersQueryDto, OrderSortBy } from './dto/get-orders-query.dto';
import { ErrorResponse } from '../../../common/dtos/error-response.dto';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';

type AuthenticatedRequest = ExpressRequest & { user: AuthenticatedUser };

@ApiTags('Orders')
@ApiBearerAuth()
@ApiExtraModels(ErrorResponse)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
@Controller('orders')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.ORDERS)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Create a new order',
    description:
      'Creates a new order for the authenticated merchant. Validates that all related entities (table, collaborator, subscription, customer) belong to the merchant.',
  })
  @ApiBody({ type: CreateOrderDto })
  @ApiCreatedResponse({
    description: 'Order created successfully',
    type: OneOrderResponseDto,
    schema: {
      example: {
        statusCode: 201,
        message: 'Order created successfully',
        data: {
          id: 1,
          merchantId: 1,
          tableId: 1,
          collaboratorId: 1,
          subscriptionId: 1,
          businessStatus: 'pending',
          type: 'dine_in',
          customerId: 1,
          status: 'active',
          createdAt: '2024-01-15T08:00:00Z',
          closedAt: null,
          updatedAt: '2024-01-15T08:00:00Z',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid data',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'Order status is required',
        error: 'Bad Request',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized',
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
    description: 'Forbidden',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 403,
        message: 'You can only create orders for your own merchant',
        error: 'Forbidden',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Related resource not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Table with ID 1 not found',
        error: 'Not Found',
      },
    },
  })
  async create(
    @Body() dto: CreateOrderDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<OneOrderResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.ordersService.create(dto, authenticatedUserMerchantId);
  }

  @Get()
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Get all orders',
    description:
      'Retrieves all orders for the authenticated merchant with pagination and filtering options. Only returns orders with status = ACTIVE by default.',
  })
  @ApiQuery({
    name: 'tableId',
    required: false,
    type: Number,
    description: 'Filter by table ID',
  })
  @ApiQuery({
    name: 'collaboratorId',
    required: false,
    type: Number,
    description: 'Filter by collaborator ID',
  })
  @ApiQuery({
    name: 'subscriptionId',
    required: false,
    type: Number,
    description: 'Filter by subscription ID',
  })
  @ApiQuery({
    name: 'customerId',
    required: false,
    type: Number,
    description: 'Filter by customer ID',
  })
  @ApiQuery({
    name: 'businessStatus',
    required: false,
    enum: ['pending', 'in_progress', 'completed', 'cancelled'],
    description: 'Filter by business status',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['dine_in', 'take_out', 'delivery'],
    description: 'Filter by order type',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['active', 'deleted'],
    description: 'Filter by logical status (for deletion)',
  })
  @ApiQuery({
    name: 'createdDate',
    required: false,
    type: String,
    description: 'Filter by creation date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10, max: 100)',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: Object.values(OrderSortBy),
    description: 'Field to sort by',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Sort order (default: DESC)',
  })
  @ApiOkResponse({
    description: 'Orders retrieved successfully',
    type: PaginatedOrdersResponseDto,
    schema: {
      example: {
        statusCode: 200,
        message: 'Orders retrieved successfully',
        data: [
          {
            id: 1,
            merchantId: 1,
            tableId: 1,
            collaboratorId: 1,
            subscriptionId: 1,
            businessStatus: 'pending',
            type: 'dine_in',
            customerId: 1,
            status: 'active',
            createdAt: '2024-01-15T08:00:00Z',
            closedAt: null,
            updatedAt: '2024-01-15T08:00:00Z',
          },
        ],
        paginationMeta: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid query',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'Page must be >= 1',
        error: 'Bad Request',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'Forbidden',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 403,
        message: 'You must be associated with a merchant',
        error: 'Forbidden',
      },
    },
  })
  async findAll(
    @Query() query: GetOrdersQueryDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<PaginatedOrdersResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.ordersService.findAll(query, authenticatedUserMerchantId);
  }

  @Get(':id')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Get an order by id',
    description:
      'Retrieves a single order by its ID. Only returns orders with status = ACTIVE.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Order ID' })
  @ApiOkResponse({
    description: 'Order retrieved successfully',
    type: OneOrderResponseDto,
    schema: {
      example: {
        statusCode: 200,
        message: 'Order retrieved successfully',
        data: {
          id: 1,
          merchantId: 1,
          tableId: 1,
          collaboratorId: 1,
          subscriptionId: 1,
          businessStatus: 'pending',
          type: 'dine_in',
          customerId: 1,
          status: 'active',
          createdAt: '2024-01-15T08:00:00Z',
          closedAt: null,
          updatedAt: '2024-01-15T08:00:00Z',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid id',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid id',
        error: 'Bad Request',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'Forbidden',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 403,
        message: 'You can only access orders from your merchant',
        error: 'Forbidden',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Order not found',
        error: 'Not Found',
      },
    },
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ): Promise<OneOrderResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.ordersService.findOne(id, authenticatedUserMerchantId);
  }

  @Put(':id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Update an order',
    description:
      'Updates an existing order. Validates that all related entities belong to the merchant.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Order ID' })
  @ApiBody({ type: UpdateOrderDto })
  @ApiOkResponse({
    description: 'Order updated successfully',
    type: OneOrderResponseDto,
    schema: {
      example: {
        statusCode: 200,
        message: 'Order updated successfully',
        data: {
          id: 1,
          merchantId: 1,
          tableId: 1,
          collaboratorId: 1,
          subscriptionId: 1,
          businessStatus: 'completed',
          type: 'dine_in',
          customerId: 1,
          status: 'active',
          createdAt: '2024-01-15T08:00:00Z',
          closedAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-01-15T10:00:00Z',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid data',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid business status',
        error: 'Bad Request',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'Forbidden',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 403,
        message: 'You can only update orders from your merchant',
        error: 'Forbidden',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Order not found',
        error: 'Not Found',
      },
    },
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<OneOrderResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.ordersService.update(id, dto, authenticatedUserMerchantId);
  }

  @Delete(':id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Delete an order (logical)',
    description:
      'Performs a logical deletion of an order by setting status to DELETED.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Order ID' })
  @ApiOkResponse({
    description: 'Order deleted successfully',
    type: OneOrderResponseDto,
    schema: {
      example: {
        statusCode: 200,
        message: 'Order deleted successfully',
        data: {
          id: 1,
          merchantId: 1,
          tableId: 1,
          collaboratorId: 1,
          subscriptionId: 1,
          businessStatus: 'pending',
          type: 'dine_in',
          customerId: 1,
          status: 'active',
          createdAt: '2024-01-15T08:00:00Z',
          closedAt: null,
          updatedAt: '2024-01-15T08:00:00Z',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid id',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid id',
        error: 'Bad Request',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'Forbidden',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 403,
        message: 'You can only delete orders from your merchant',
        error: 'Forbidden',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Order not found',
        error: 'Not Found',
      },
    },
  })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ): Promise<OneOrderResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.ordersService.remove(id, authenticatedUserMerchantId);
  }
}
