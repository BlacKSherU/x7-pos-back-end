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
import { KitchenOrderItemService } from './kitchen-order-item.service';
import { CreateKitchenOrderItemDto } from './dto/create-kitchen-order-item.dto';
import { UpdateKitchenOrderItemDto } from './dto/update-kitchen-order-item.dto';
import { BatchBumpFifoDto } from './dto/batch-bump-fifo.dto';
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
import { AuthenticatedUser } from '../../../auth/interfaces/authenticated-user.interface';
import { OneKitchenOrderItemResponseDto } from './dto/kitchen-order-item-response.dto';
import { KitchenCourse } from './constants/kitchen-course.enum';
import { GetKitchenOrderItemQueryDto } from './dto/get-kitchen-order-item-query.dto';
import { PaginatedKitchenOrderItemResponseDto } from './dto/kitchen-order-item-response.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { KitchenOrderItemStatus } from './constants/kitchen-order-item-status.enum';

type AuthenticatedRequest = ExpressRequest & { user: AuthenticatedUser };

@ApiTags('Restaurant operations - Kitchen Display System - Kitchen Order Items')
@ApiBearerAuth()
@Controller('kitchen-order-items')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.KITCHEN_ORDER_ITEMS)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
export class KitchenOrderItemController {
  constructor(
    private readonly kitchenOrderItemService: KitchenOrderItemService,
  ) {}

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
    summary: 'Create a new Kitchen Order Item',
    description:
      "Creates a new kitchen order item. The kitchen order must belong to the authenticated user's merchant. Only portal administrators and merchant administrators can create kitchen order items.",
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
    description:
      'Forbidden - You must be associated with a merchant to create kitchen order items',
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
  async create(
    @Body() createKitchenOrderItemDto: CreateKitchenOrderItemDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.kitchenOrderItemService.create(
      createKitchenOrderItemDto,
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
    summary: 'Get all Kitchen Order Items',
    description:
      "Retrieves a paginated list of kitchen order items. Only returns items that belong to kitchen orders of the authenticated user's merchant. Only portal administrators and merchant administrators can access kitchen order items.",
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
    description:
      'Forbidden - You must be associated with a merchant to access kitchen order items',
    type: ErrorResponse,
  })
  @ApiQuery({
    name: 'kitchenOrderId',
    required: false,
    type: Number,
    description: 'Filter by kitchen order ID',
  })
  @ApiQuery({
    name: 'stationId',
    required: false,
    type: Number,
    description: 'Filter by kitchen station ID',
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
    enum: [
      'id',
      'kitchenOrderId',
      'orderItemId',
      'productId',
      'variantId',
      'quantity',
      'preparedQuantity',
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
    @Query() query: GetKitchenOrderItemQueryDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.kitchenOrderItemService.findAll(
      query,
      authenticatedUserMerchantId,
    );
  }

  @Post(':id/increment')
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
      'Increment kitchen order item prepared quantity (Tap-to-Increment)',
    description:
      'Increments prepared_quantity by 1. Transitions preparation_status from pending to in_preparation, and to ready once prepared_quantity equals quantity. Automatically auto-bumps parent KitchenOrder to COMPLETED when all items become ready.',
  })
  @ApiOkResponse({
    description: 'Kitchen order item quantity incremented successfully',
    type: OneKitchenOrderItemResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - You must be associated with a merchant to update kitchen order items',
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
  async incrementPreparedQuantity(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.kitchenOrderItemService.incrementPreparedQuantity(
      id,
      authenticatedUserMerchantId,
      req.user?.id,
    );
  }

  @Post(':id/preparation/next')
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
    summary: 'Advance kitchen order item preparation status',
    description:
      'Moves preparation to the next step (pending → in preparation → ready). Cannot advance from the final status. Same access rules as updating a kitchen order item.',
  })
  @ApiOkResponse({
    description: 'Preparation status advanced successfully',
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
    description:
      'Forbidden - You must be associated with a merchant to update kitchen order items',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Kitchen order item not found',
    type: ErrorResponse,
  })
  @ApiConflictResponse({
    description:
      'Conflict - Already at final preparation status, or item is deleted',
    type: ErrorResponse,
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Kitchen order item ID',
    example: 1,
  })
  async advancePreparationStatus(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.kitchenOrderItemService.advancePreparationStatus(
      id,
      authenticatedUserMerchantId,
      req.user?.id,
    );
  }

  @Post(':id/preparation/previous')
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
    summary: 'Revert kitchen order item preparation status',
    description:
      'Moves preparation to the previous step (ready → in preparation → pending). Pending is as far back as it goes: to hold an item use the hold endpoint, which sets the hold timer. Same access rules as updating a kitchen order item.',
  })
  @ApiOkResponse({
    description: 'Preparation status reverted successfully',
    type: OneKitchenOrderItemResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - You must be associated with a merchant to update kitchen order items',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Kitchen order item not found',
    type: ErrorResponse,
  })
  @ApiConflictResponse({
    description: 'Conflict - Already pending or held, or item is deleted',
    type: ErrorResponse,
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Kitchen order item ID',
    example: 1,
  })
  async revertPreparationStatus(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.kitchenOrderItemService.revertPreparationStatus(
      id,
      authenticatedUserMerchantId,
      req.user?.id,
    );
  }

  @Post(':id/fire')
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
    summary: 'Fire a held kitchen order item to the active queue',
    description:
      'Transitions preparation_status from HELD to PENDING, records fired_at timestamp, and sends item to line cooks.',
  })
  @ApiOkResponse({
    description: 'Kitchen order item fired successfully',
    type: OneKitchenOrderItemResponseDto,
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Kitchen order item ID',
    example: 1,
  })
  async fireItem(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.kitchenOrderItemService.fireItem(
      id,
      authenticatedUserMerchantId,
      req.user?.id,
    );
  }

  @Post(':id/hold')
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
    summary: 'Put an active kitchen order item on hold with pacing delay',
    description:
      'Transitions preparation_status to HELD and sets an automated hold_until timer.',
  })
  @ApiOkResponse({
    description: 'Kitchen order item held successfully',
    type: OneKitchenOrderItemResponseDto,
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Kitchen order item ID',
    example: 1,
  })
  async holdItem(
    @Param('id', ParseIntPipe) id: number,
    @Query('holdMinutes') holdMinutes: number,
    @Request() req: AuthenticatedRequest,
  ) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.kitchenOrderItemService.holdItem(
      id,
      holdMinutes ? Number(holdMinutes) : 10,
      authenticatedUserMerchantId,
      req.user?.id,
    );
  }

  @Post('order/:kitchenOrderId/fire-course')
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
    summary: 'Fire an entire course (e.g. MAIN_COURSE, DESSERT) for an order',
    description:
      'Releases all held items belonging to the specified course to line cook displays.',
  })
  @ApiParam({
    name: 'kitchenOrderId',
    type: Number,
    description: 'Kitchen order ID',
    example: 1,
  })
  @ApiQuery({
    name: 'course',
    enum: KitchenCourse,
    description: 'Course to fire (appetizer, main_course, dessert, beverage)',
    required: true,
  })
  async fireCourse(
    @Param('kitchenOrderId', ParseIntPipe) kitchenOrderId: number,
    @Query('course') course: KitchenCourse,
    @Request() req: AuthenticatedRequest,
  ) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.kitchenOrderItemService.fireCourse(
      kitchenOrderId,
      course || KitchenCourse.MAIN_COURSE,
      authenticatedUserMerchantId,
      req.user?.id,
    );
  }

  @Post('auto-pacing/tick')
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
    summary: 'Run automated pacing evaluation and auto-fire expired items',
    description:
      'Checks for any held items whose pacing timers have expired and transitions them to PENDING.',
  })
  async processAutoPacing(@Request() req: AuthenticatedRequest) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.kitchenOrderItemService.processAutoPacing(
      authenticatedUserMerchantId,
      req.user?.id,
    );
  }

  @Post('batch-bump-fifo')
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
    summary: 'FIFO Batch Bumping for All-Day cooking station quantities',
    description:
      'Distributes a batch cooked quantity across active tickets following strict FIFO (oldest ticket first). Increments prepared_quantity, sets READY upon completion, and cascades parent auto-bump.',
  })
  @ApiBody({ type: BatchBumpFifoDto })
  async batchBumpFifo(
    @Body() dto: BatchBumpFifoDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.kitchenOrderItemService.batchBumpFifo(
      dto,
      authenticatedUserMerchantId,
      req.user?.id,
    );
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
    summary: 'Get a single Kitchen Order Item by ID',
    description:
      "Retrieves a single kitchen order item by its ID. The item must belong to a kitchen order of the authenticated user's merchant. Only portal administrators and merchant administrators can access kitchen order items.",
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
    description:
      'Forbidden - You must be associated with a merchant to access kitchen order items',
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
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.kitchenOrderItemService.findOne(
      id,
      authenticatedUserMerchantId,
    );
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
    summary: 'Update a Kitchen Order Item',
    description:
      "Updates an existing kitchen order item. The item must belong to a kitchen order of the authenticated user's merchant. Only portal administrators and merchant administrators can update kitchen order items.",
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
    description:
      'Forbidden - You must be associated with a merchant to update kitchen order items',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description:
      'Kitchen order item, kitchen order, order item, product, or variant not found',
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
    @Request() req: AuthenticatedRequest,
  ) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.kitchenOrderItemService.update(
      id,
      updateKitchenOrderItemDto,
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
    summary: 'Delete a Kitchen Order Item',
    description:
      "Performs a logical deletion of a kitchen order item. The item must belong to a kitchen order of the authenticated user's merchant. Only portal administrators and merchant administrators can delete kitchen order items.",
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
    description:
      'Forbidden - You must be associated with a merchant to delete kitchen order items',
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
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.kitchenOrderItemService.remove(id, authenticatedUserMerchantId);
  }
}
