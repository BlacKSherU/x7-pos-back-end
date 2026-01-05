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
} from '@nestjs/swagger';
import { KitchenOrderResponseDto, OneKitchenOrderResponseDto } from './dto/kitchen-order-response.dto';
import { GetKitchenOrderQueryDto } from './dto/get-kitchen-order-query.dto';
import { PaginatedKitchenOrderResponseDto } from './dto/paginated-kitchen-order-response.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/constants/role.enum';
import { Scope } from 'src/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { KitchenOrderBusinessStatus } from './constants/kitchen-order-business-status.enum';

@ApiTags('Kitchen Orders')
@ApiBearerAuth()
@Controller('kitchen-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class KitchenOrderController {
  constructor(private readonly kitchenOrderService: KitchenOrderService) {}

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
    summary: 'Create a new Kitchen Order',
    description: 'Creates a new kitchen order. Either orderId or onlineOrderId must be provided. The order must belong to the authenticated user\'s merchant. Only portal administrators and merchant administrators can create kitchen orders.',
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
    description: 'Forbidden - You must be associated with a merchant to create kitchen orders',
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
  async create(@Body() createKitchenOrderDto: CreateKitchenOrderDto, @Request() req: any) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.kitchenOrderService.create(createKitchenOrderDto, authenticatedUserMerchantId);
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
    summary: 'Get all Kitchen Orders',
    description: 'Retrieves a paginated list of kitchen orders. Only returns orders that belong to the authenticated user\'s merchant. Only portal administrators and merchant administrators can access kitchen orders.',
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
    description: 'Forbidden - You must be associated with a merchant to access kitchen orders',
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
    enum: ['id', 'orderId', 'onlineOrderId', 'stationId', 'priority', 'businessStatus', 'startedAt', 'completedAt', 'createdAt', 'updatedAt'],
    description: 'Field to sort by',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Sort order (ASC or DESC)',
  })
  async findAll(@Query() query: GetKitchenOrderQueryDto, @Request() req: any) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.kitchenOrderService.findAll(query, authenticatedUserMerchantId);
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
    summary: 'Get a single Kitchen Order by ID',
    description: 'Retrieves a single kitchen order by its ID. The order must belong to the authenticated user\'s merchant. Only portal administrators and merchant administrators can access kitchen orders.',
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
    description: 'Forbidden - You must be associated with a merchant to access kitchen orders',
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
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.kitchenOrderService.findOne(id, authenticatedUserMerchantId);
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
    summary: 'Update a Kitchen Order',
    description: 'Updates an existing kitchen order. The order must belong to the authenticated user\'s merchant. Only portal administrators and merchant administrators can update kitchen orders.',
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
    description: 'Forbidden - You must be associated with a merchant to update kitchen orders',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Kitchen order, order, online order, or kitchen station not found',
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
    @Request() req: any,
  ) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.kitchenOrderService.update(id, updateKitchenOrderDto, authenticatedUserMerchantId);
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
    summary: 'Delete a Kitchen Order',
    description: 'Performs a logical deletion of a kitchen order. The order must belong to the authenticated user\'s merchant. Only portal administrators and merchant administrators can delete kitchen orders.',
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
    description: 'Forbidden - You must be associated with a merchant to delete kitchen orders',
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
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.kitchenOrderService.remove(id, authenticatedUserMerchantId);
  }
}
