import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  Query,
  Request,
} from '@nestjs/common';
import { FeatureAccessGuard } from 'src/auth/guards/feature-access.guard';
import { RequireFeature } from 'src/auth/decorators/require-feature.decorator';
import { SUBSCRIPTION_FEATURE_IDS } from 'src/common/subscription/subscription-feature-ids';

import { Request as ExpressRequest } from 'express';
import { OrderItemModifiersService } from './order-item-modifiers.service';
import { CreateOrderItemModifierDto } from './dto/create-order-item-modifier.dto';
import { UpdateOrderItemModifierDto } from './dto/update-order-item-modifier.dto';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiBody,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthenticatedUser } from '../../../auth/interfaces/authenticated-user.interface';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { UserRole } from '../../../platform-saas/users/constants/role.enum';
import { Scope } from '../../../platform-saas/users/constants/scope.enum';
import {
  GetOrderItemModifierQueryDto,
  OrderItemModifierSortBy,
} from './dto/get-order-item-modifier-query.dto';
import { OneOrderItemModifierResponseDto } from './dto/order-item-modifier-response.dto';
import { PaginatedOrderItemModifierResponseDto } from './dto/paginated-order-item-modifier-response.dto';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';

type AuthenticatedRequest = ExpressRequest & { user: AuthenticatedUser };

@ApiTags('Order item modifiers')
@ApiBearerAuth()
@Controller('order-item-modifiers')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.ORDER_ITEM_MODIFIERS)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
export class OrderItemModifiersController {
  constructor(
    private readonly orderItemModifiersService: OrderItemModifiersService,
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
  @ApiOperation({ summary: 'Create order item modifier' })
  @ApiBody({ type: CreateOrderItemModifierDto })
  @ApiCreatedResponse({ type: OneOrderItemModifierResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponse })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  @ApiForbiddenResponse({ type: ErrorResponse })
  @ApiNotFoundResponse({ type: ErrorResponse })
  async create(
    @Body() dto: CreateOrderItemModifierDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<OneOrderItemModifierResponseDto> {
    return this.orderItemModifiersService.create(dto, req.user?.merchant?.id);
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
  @ApiOperation({ summary: 'List order item modifiers (paginated)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'orderItemId', required: false })
  @ApiQuery({ name: 'modifierId', required: false })
  @ApiQuery({ name: 'sortBy', required: false, enum: OrderItemModifierSortBy })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiOkResponse({ type: PaginatedOrderItemModifierResponseDto })
  async findAll(
    @Query() query: GetOrderItemModifierQueryDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<PaginatedOrderItemModifierResponseDto> {
    return this.orderItemModifiersService.findAll(
      query,
      req.user?.merchant?.id,
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
  @ApiOperation({ summary: 'Get one order item modifier' })
  @ApiParam({ name: 'id' })
  @ApiOkResponse({ type: OneOrderItemModifierResponseDto })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ): Promise<OneOrderItemModifierResponseDto> {
    return this.orderItemModifiersService.findOne(id, req.user?.merchant?.id);
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
  @ApiOperation({ summary: 'Update order item modifier' })
  @ApiParam({ name: 'id' })
  @ApiBody({ type: UpdateOrderItemModifierDto })
  @ApiOkResponse({ type: OneOrderItemModifierResponseDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderItemModifierDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<OneOrderItemModifierResponseDto> {
    return this.orderItemModifiersService.update(
      id,
      dto,
      req.user?.merchant?.id,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Delete order item modifier' })
  @ApiParam({ name: 'id' })
  @ApiOkResponse({ type: OneOrderItemModifierResponseDto })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ): Promise<OneOrderItemModifierResponseDto> {
    return this.orderItemModifiersService.remove(id, req.user?.merchant?.id);
  }
}
