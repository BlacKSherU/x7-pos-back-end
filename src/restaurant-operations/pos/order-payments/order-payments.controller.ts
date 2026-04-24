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
import { Request as ExpressRequest } from 'express';
import { OrderPaymentsService } from './order-payments.service';
import { CreateOrderPaymentDto } from './dto/create-order-payment.dto';
import { UpdateOrderPaymentDto } from './dto/update-order-payment.dto';
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
  GetOrderPaymentQueryDto,
  OrderPaymentSortBy,
} from './dto/get-order-payment-query.dto';
import { OneOrderPaymentResponseDto } from './dto/order-payment-response.dto';
import { PaginatedOrderPaymentResponseDto } from './dto/paginated-order-payment-response.dto';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';

type AuthenticatedRequest = ExpressRequest & { user: AuthenticatedUser };

@ApiTags('Order payments')
@ApiBearerAuth()
@Controller('order-payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrderPaymentsController {
  constructor(private readonly orderPaymentsService: OrderPaymentsService) {}

  @Post()
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Create an order payment' })
  @ApiBody({ type: CreateOrderPaymentDto })
  @ApiCreatedResponse({ type: OneOrderPaymentResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponse })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  @ApiForbiddenResponse({ type: ErrorResponse })
  @ApiNotFoundResponse({ type: ErrorResponse })
  async create(
    @Body() dto: CreateOrderPaymentDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<OneOrderPaymentResponseDto> {
    return this.orderPaymentsService.create(dto, req.user?.merchant?.id);
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
  @ApiOperation({ summary: 'List order payments (paginated)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'orderId', required: false })
  @ApiQuery({ name: 'method', required: false })
  @ApiQuery({ name: 'isRefund', required: false })
  @ApiQuery({ name: 'createdDate', required: false })
  @ApiQuery({ name: 'sortBy', required: false, enum: OrderPaymentSortBy })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiOkResponse({ type: PaginatedOrderPaymentResponseDto })
  async findAll(
    @Query() query: GetOrderPaymentQueryDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<PaginatedOrderPaymentResponseDto> {
    return this.orderPaymentsService.findAll(query, req.user?.merchant?.id);
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
  @ApiOperation({ summary: 'Get one order payment' })
  @ApiParam({ name: 'id' })
  @ApiOkResponse({ type: OneOrderPaymentResponseDto })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ): Promise<OneOrderPaymentResponseDto> {
    return this.orderPaymentsService.findOne(id, req.user?.merchant?.id);
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
  @ApiOperation({ summary: 'Update an order payment' })
  @ApiParam({ name: 'id' })
  @ApiBody({ type: UpdateOrderPaymentDto })
  @ApiOkResponse({ type: OneOrderPaymentResponseDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderPaymentDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<OneOrderPaymentResponseDto> {
    return this.orderPaymentsService.update(id, dto, req.user?.merchant?.id);
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
  @ApiOperation({ summary: 'Delete an order payment' })
  @ApiParam({ name: 'id' })
  @ApiOkResponse({ type: OneOrderPaymentResponseDto })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ): Promise<OneOrderPaymentResponseDto> {
    return this.orderPaymentsService.remove(id, req.user?.merchant?.id);
  }
}
