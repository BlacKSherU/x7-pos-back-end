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
import { OrderTaxesService } from './order-taxes.service';
import { CreateOrderTaxDto } from './dto/create-order-tax.dto';
import { UpdateOrderTaxDto } from './dto/update-order-tax.dto';
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
  GetOrderTaxQueryDto,
  OrderTaxSortBy,
} from './dto/get-order-tax-query.dto';
import { OneOrderTaxResponseDto } from './dto/order-tax-response.dto';
import { PaginatedOrderTaxResponseDto } from './dto/paginated-order-tax-response.dto';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';

@ApiTags('Order taxes')
@ApiBearerAuth()
@Controller('order-taxes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrderTaxesController {
  constructor(private readonly orderTaxesService: OrderTaxesService) {}

  @Post()
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Create an order tax line' })
  @ApiBody({ type: CreateOrderTaxDto })
  @ApiCreatedResponse({ type: OneOrderTaxResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponse })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  @ApiForbiddenResponse({ type: ErrorResponse })
  @ApiNotFoundResponse({ type: ErrorResponse })
  async create(
    @Body() dto: CreateOrderTaxDto,
    @Request() req: AuthenticatedUser,
  ): Promise<OneOrderTaxResponseDto> {
    return this.orderTaxesService.create(dto, req.merchant?.id);
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
  @ApiOperation({ summary: 'List order taxes (paginated)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'orderId', required: false })
  @ApiQuery({ name: 'name', required: false })
  @ApiQuery({ name: 'createdDate', required: false })
  @ApiQuery({ name: 'sortBy', required: false, enum: OrderTaxSortBy })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiOkResponse({ type: PaginatedOrderTaxResponseDto })
  async findAll(
    @Query() query: GetOrderTaxQueryDto,
    @Request() req: AuthenticatedUser,
  ): Promise<PaginatedOrderTaxResponseDto> {
    return this.orderTaxesService.findAll(query, req.merchant?.id);
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
  @ApiOperation({ summary: 'Get one order tax' })
  @ApiParam({ name: 'id' })
  @ApiOkResponse({ type: OneOrderTaxResponseDto })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedUser,
  ): Promise<OneOrderTaxResponseDto> {
    return this.orderTaxesService.findOne(id, req.merchant?.id);
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
  @ApiOperation({ summary: 'Update an order tax line' })
  @ApiParam({ name: 'id' })
  @ApiBody({ type: UpdateOrderTaxDto })
  @ApiOkResponse({ type: OneOrderTaxResponseDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderTaxDto,
    @Request() req: AuthenticatedUser,
  ): Promise<OneOrderTaxResponseDto> {
    return this.orderTaxesService.update(id, dto, req.merchant?.id);
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
  @ApiOperation({ summary: 'Delete an order tax line' })
  @ApiParam({ name: 'id' })
  @ApiOkResponse({ type: OneOrderTaxResponseDto })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedUser,
  ): Promise<OneOrderTaxResponseDto> {
    return this.orderTaxesService.remove(id, req.merchant?.id);
  }
}
