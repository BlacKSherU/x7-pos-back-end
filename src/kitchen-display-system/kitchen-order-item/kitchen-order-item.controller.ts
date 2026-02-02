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
import { KitchenOrderItemService } from './kitchen-order-item.service';
import { CreateKitchenOrderItemDto } from './dto/create-kitchen-order-item.dto';
import { UpdateKitchenOrderItemDto } from './dto/update-kitchen-order-item.dto';
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
import { KitchenOrderItemResponseDto, OneKitchenOrderItemResponseDto } from './dto/kitchen-order-item-response.dto';
import { GetKitchenOrderItemQueryDto } from './dto/get-kitchen-order-item-query.dto';
import { PaginatedKitchenOrderItemResponseDto } from './dto/kitchen-order-item-response.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/constants/role.enum';
import { Scope } from 'src/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { KitchenOrderItemStatus } from './constants/kitchen-order-item-status.enum';

@ApiTags('Kitchen Order Items')
@ApiBearerAuth()
@Controller('kitchen-order-items')
@UseGuards(JwtAuthGuard, RolesGuard)
export class KitchenOrderItemController {
  constructor(private readonly kitchenOrderItemService: KitchenOrderItemService) {}

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
    summary: 'Create a new Kitchen Order Item',
    description: 'Creates a new kitchen order item. The kitchen order must belong to the authenticated user\'s merchant. Only portal administrators and merchant administrators can create kitchen order items.',
  })
  @ApiCreatedResponse({
    description: 'Kitchen order item created successfully',
    type: OneKitchenOrderItemResponseDto,
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
    description: 'Forbidden - You must be associated with a merchant to create kitchen order items',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Kitchen order, order item, product, or variant not found',
    type: ErrorResponse,
  })
  @ApiBody({
    type: CreateKitchenOrderItemDto,
    description: 'Kitchen order item creation data',
  })
  async create(@Body() createKitchenOrderItemDto: CreateKitchenOrderItemDto, @Request() req: any) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.kitchenOrderItemService.create(createKitchenOrderItemDto, authenticatedUserMerchantId);
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
    summary: 'Get all Kitchen Order Items',
    description: 'Retrieves a paginated list of kitchen order items. Only returns items that belong to kitchen orders of the authenticated user\'s merchant. Only portal administrators and merchant administrators can access kitchen order items.',
  })
  @ApiOkResponse({
    description: 'Kitchen order items retrieved successfully',
    type: PaginatedKitchenOrderItemResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - You must be associated with a merchant to access kitchen order items',
    type: ErrorResponse,
  })
  @ApiQuery({
    name: 'kitchenOrderId',
    required: false,
    type: Number,
    description: 'Filter by kitchen order ID',
  })
  @ApiQuery({
    name: 'orderItemId',
    required: false,
    type: Number,
    description: 'Filter by order item ID',
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
    name: 'status',
    required: false,
    enum: KitchenOrderItemStatus,
    description: 'Filter by status',
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
    enum: ['id', 'kitchenOrderId', 'orderItemId', 'productId', 'variantId', 'quantity', 'preparedQuantity', 'startedAt', 'completedAt', 'createdAt', 'updatedAt'],
    description: 'Field to sort by',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Sort order (ASC or DESC)',
  })
  async findAll(@Query() query: GetKitchenOrderItemQueryDto, @Request() req: any) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.kitchenOrderItemService.findAll(query, authenticatedUserMerchantId);
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
    summary: 'Get a single Kitchen Order Item by ID',
    description: 'Retrieves a single kitchen order item by its ID. The item must belong to a kitchen order of the authenticated user\'s merchant. Only portal administrators and merchant administrators can access kitchen order items.',
  })
  @ApiOkResponse({
    description: 'Kitchen order item retrieved successfully',
    type: OneKitchenOrderItemResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - You must be associated with a merchant to access kitchen order items',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Kitchen order item not found',
    type: ErrorResponse,
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Kitchen order item ID',
    example: 1,
  })
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.kitchenOrderItemService.findOne(id, authenticatedUserMerchantId);
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
    summary: 'Update a Kitchen Order Item',
    description: 'Updates an existing kitchen order item. The item must belong to a kitchen order of the authenticated user\'s merchant. Only portal administrators and merchant administrators can update kitchen order items.',
  })
  @ApiOkResponse({
    description: 'Kitchen order item updated successfully',
    type: OneKitchenOrderItemResponseDto,
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
    description: 'Forbidden - You must be associated with a merchant to update kitchen order items',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Kitchen order item, kitchen order, order item, product, or variant not found',
    type: ErrorResponse,
  })
  @ApiConflictResponse({
    description: 'Conflict - Cannot update a deleted kitchen order item',
    type: ErrorResponse,
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Kitchen order item ID',
    example: 1,
  })
  @ApiBody({
    type: UpdateKitchenOrderItemDto,
    description: 'Kitchen order item update data',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateKitchenOrderItemDto: UpdateKitchenOrderItemDto,
    @Request() req: any,
  ) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.kitchenOrderItemService.update(id, updateKitchenOrderItemDto, authenticatedUserMerchantId);
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
    summary: 'Delete a Kitchen Order Item',
    description: 'Performs a logical deletion of a kitchen order item. The item must belong to a kitchen order of the authenticated user\'s merchant. Only portal administrators and merchant administrators can delete kitchen order items.',
  })
  @ApiOkResponse({
    description: 'Kitchen order item deleted successfully',
    type: OneKitchenOrderItemResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - You must be associated with a merchant to delete kitchen order items',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Kitchen order item not found',
    type: ErrorResponse,
  })
  @ApiConflictResponse({
    description: 'Conflict - Kitchen order item is already deleted',
    type: ErrorResponse,
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Kitchen order item ID',
    example: 1,
  })
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.kitchenOrderItemService.remove(id, authenticatedUserMerchantId);
  }
}
