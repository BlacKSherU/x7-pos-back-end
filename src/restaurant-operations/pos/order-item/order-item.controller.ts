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
import { OrderItemService } from './order-item.service';
import { CreateOrderItemDto } from './dto/create-order-item.dto';
import { UpdateOrderItemDto } from './dto/update-order-item.dto';
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
import { AuthenticatedUser } from '../../../auth/interfaces/authenticated-user.interface';
import { OneOrderItemResponseDto } from './dto/order-item-response.dto';
import { GetOrderItemQueryDto } from './dto/get-order-item-query.dto';
import { PaginatedOrderItemResponseDto } from './dto/paginated-order-item-response.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { OrderItemStatus } from './constants/order-item-status.enum';

@ApiTags('Order Items')
@ApiBearerAuth()
@Controller('order-item')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrderItemController {
  constructor(private readonly orderItemService: OrderItemService) {}

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
    summary: 'Create a new Order Item',
    description:
      "Creates a new order item for the authenticated user's merchant. Only portal administrators and merchant administrators can create order items. The order, product, and variant (if provided) must exist and belong to the merchant.",
  })
  @ApiCreatedResponse({
    description: 'Order item created successfully',
    type: OneOrderItemResponseDto,
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
      'Forbidden - You can only create order items for orders belonging to your merchant',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Order, Product or Variant not found',
    type: ErrorResponse,
  })
  @ApiBody({
    type: CreateOrderItemDto,
    description: 'Order item creation data',
    examples: {
      example1: {
        summary: 'Create order item with product only',
        value: {
          orderId: 1,
          productId: 1,
          quantity: 2,
          price: 125.5,
          discount: 10.0,
        },
      },
      example2: {
        summary: 'Create order item with product, variant and kitchen status',
        value: {
          orderId: 1,
          productId: 1,
          variantId: 1,
          quantity: 1,
          price: 150.0,
          discount: 0,
          kitchenStatus: 'pending',
          notes: 'Extra sauce on the side',
        },
      },
    },
  })
  async create(
    @Body() dto: CreateOrderItemDto,
    @Request() req: AuthenticatedUser,
  ): Promise<OneOrderItemResponseDto> {
    const authenticatedUserMerchantId = req.merchant?.id;
    return this.orderItemService.create(dto, authenticatedUserMerchantId);
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
    summary: 'Get all Order Items with pagination and filters',
    description:
      "Retrieves a paginated list of order items for the authenticated user's merchant. Supports filtering by order, product, variant, kitchen status, logical status, and creation date.",
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
    name: 'orderId',
    required: false,
    type: Number,
    description: 'Filter by order ID',
    example: 1,
  })
  @ApiQuery({
    name: 'productId',
    required: false,
    type: Number,
    description: 'Filter by product ID',
    example: 1,
  })
  @ApiQuery({
    name: 'variantId',
    required: false,
    type: Number,
    description: 'Filter by variant ID',
    example: 1,
  })
  @ApiQuery({
    name: 'kitchenStatus',
    required: false,
    enum: ['pending', 'in_preparation', 'ready', 'served'],
    description: 'Filter by line kitchen status',
    example: 'pending',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: OrderItemStatus,
    description: 'Filter by status (active, deleted)',
    example: OrderItemStatus.ACTIVE,
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
    enum: ['quantity', 'price', 'discount', 'createdAt', 'updatedAt'],
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
    description: 'Paginated list of order items retrieved successfully',
    type: PaginatedOrderItemResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - User must be associated with a merchant to view order items',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters',
    type: ErrorResponse,
  })
  async findAll(
    @Query() query: GetOrderItemQueryDto,
    @Request() req: AuthenticatedUser,
  ): Promise<PaginatedOrderItemResponseDto> {
    const authenticatedUserMerchantId = req.merchant?.id;
    return this.orderItemService.findAll(query, authenticatedUserMerchantId);
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
    summary: 'Get an Order Item by ID',
    description:
      'Retrieves a specific order item by its ID. Users can only access order items from their own merchant.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Order item ID' })
  @ApiOkResponse({
    description: 'Order item found successfully',
    type: OneOrderItemResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({
    description:
      'Forbidden - You can only view order items from your own merchant',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Order item not found',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'Invalid order item ID',
    type: ErrorResponse,
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedUser,
  ): Promise<OneOrderItemResponseDto> {
    const authenticatedUserMerchantId = req.merchant?.id;
    return this.orderItemService.findOne(id, authenticatedUserMerchantId);
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
    summary: 'Update an Order Item by ID',
    description:
      "Updates an existing order item for the authenticated user's merchant. Only portal administrators and merchant administrators can update order items. All fields are optional.",
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Order item ID to update',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Order item updated successfully',
    type: OneOrderItemResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - You can only update order items from your own merchant',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Order item, Order, Product or Variant not found',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or ID',
    type: ErrorResponse,
  })
  @ApiBody({
    type: UpdateOrderItemDto,
    description: 'Order item update data (all fields optional)',
    examples: {
      example1: {
        summary: 'Update quantity and price',
        value: {
          quantity: 3,
          price: 150.0,
        },
      },
      example2: {
        summary: 'Update discount and notes',
        value: {
          discount: 15.0,
          notes: 'Updated notes',
        },
      },
    },
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderItemDto,
    @Request() req: AuthenticatedUser,
  ): Promise<OneOrderItemResponseDto> {
    const authenticatedUserMerchantId = req.merchant?.id;
    return this.orderItemService.update(id, dto, authenticatedUserMerchantId);
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
    summary: 'Soft delete an Order Item by ID',
    description:
      'Performs a soft delete by changing the order item status to "deleted". Only portal administrators and merchant administrators can delete order items from their own merchant.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Order item ID to delete',
  })
  @ApiOkResponse({
    description: 'Order item soft deleted successfully',
    type: OneOrderItemResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({
    description:
      'Forbidden - You can only delete order items from your own merchant',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Order item not found',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'Invalid order item ID',
    type: ErrorResponse,
  })
  @ApiConflictResponse({
    description: 'Order item is already deleted',
    type: ErrorResponse,
  })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedUser,
  ): Promise<OneOrderItemResponseDto> {
    const authenticatedUserMerchantId = req.merchant?.id;
    return this.orderItemService.remove(id, authenticatedUserMerchantId);
  }
}
