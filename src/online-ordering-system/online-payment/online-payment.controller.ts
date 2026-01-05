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
import { OnlinePaymentService } from './online-payment.service';
import { CreateOnlinePaymentDto } from './dto/create-online-payment.dto';
import { UpdateOnlinePaymentDto } from './dto/update-online-payment.dto';
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
import { OnlinePaymentResponseDto, OneOnlinePaymentResponseDto } from './dto/online-payment-response.dto';
import { GetOnlinePaymentQueryDto } from './dto/get-online-payment-query.dto';
import { PaginatedOnlinePaymentResponseDto } from './dto/paginated-online-payment-response.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/constants/role.enum';
import { Scope } from 'src/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { OnlineOrderPaymentStatus } from '../online-order/constants/online-order-payment-status.enum';

@ApiTags('Online Payments')
@ApiBearerAuth()
@Controller('online-payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OnlinePaymentController {
  constructor(private readonly onlinePaymentService: OnlinePaymentService) {}

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
    summary: 'Create a new Online Payment',
    description: 'Creates a new online payment. The online order must belong to the authenticated user\'s merchant. Only portal administrators and merchant administrators can create online payments.',
  })
  @ApiCreatedResponse({
    description: 'Online payment created successfully',
    type: OneOnlinePaymentResponseDto,
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
    description: 'Forbidden - You must be associated with a merchant to create online payments',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Online order not found or you do not have access to it',
    type: ErrorResponse,
  })
  @ApiBody({
    type: CreateOnlinePaymentDto,
    description: 'Online payment creation data',
    examples: {
      example1: {
        summary: 'Create online payment',
        value: {
          onlineOrderId: 1,
          paymentProvider: 'stripe',
          transactionId: 'txn_1234567890',
          amount: 125.99,
          status: OnlineOrderPaymentStatus.PAID,
          processedAt: '2024-01-15T08:30:00Z',
        },
      },
    },
  })
  async create(@Body() createOnlinePaymentDto: CreateOnlinePaymentDto, @Request() req: any) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.onlinePaymentService.create(createOnlinePaymentDto, authenticatedUserMerchantId);
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
    summary: 'Get all Online Payments',
    description: 'Retrieves a paginated list of online payments. Only returns payments from online orders that belong to the authenticated user\'s merchant. Only portal administrators and merchant administrators can access online payments.',
  })
  @ApiOkResponse({
    description: 'Online payments retrieved successfully',
    type: PaginatedOnlinePaymentResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - You must be associated with a merchant to access online payments',
    type: ErrorResponse,
  })
  @ApiQuery({
    name: 'onlineOrderId',
    required: false,
    type: Number,
    description: 'Filter by online order ID',
  })
  @ApiQuery({
    name: 'paymentProvider',
    required: false,
    type: String,
    description: 'Filter by payment provider',
  })
  @ApiQuery({
    name: 'transactionId',
    required: false,
    type: String,
    description: 'Filter by transaction ID',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: OnlineOrderPaymentStatus,
    description: 'Filter by payment status',
  })
  @ApiQuery({
    name: 'createdDate',
    required: false,
    type: String,
    description: 'Filter by creation date (YYYY-MM-DD format)',
  })
  @ApiQuery({
    name: 'processedDate',
    required: false,
    type: String,
    description: 'Filter by processed date (YYYY-MM-DD format)',
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
    enum: ['id', 'onlineOrderId', 'paymentProvider', 'transactionId', 'amount', 'status', 'processedAt', 'createdAt', 'updatedAt'],
    description: 'Field to sort by',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Sort order (ASC or DESC)',
  })
  async findAll(@Query() query: GetOnlinePaymentQueryDto, @Request() req: any) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.onlinePaymentService.findAll(query, authenticatedUserMerchantId);
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
    summary: 'Get a single Online Payment by ID',
    description: 'Retrieves a single online payment by its ID. The payment must belong to an online order that belongs to the authenticated user\'s merchant. Only portal administrators and merchant administrators can access online payments.',
  })
  @ApiOkResponse({
    description: 'Online payment retrieved successfully',
    type: OneOnlinePaymentResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - You must be associated with a merchant to access online payments',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Online payment not found',
    type: ErrorResponse,
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Online payment ID',
    example: 1,
  })
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.onlinePaymentService.findOne(id, authenticatedUserMerchantId);
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
    summary: 'Update an Online Payment',
    description: 'Updates an existing online payment. The payment must belong to an online order that belongs to the authenticated user\'s merchant. Only portal administrators and merchant administrators can update online payments.',
  })
  @ApiOkResponse({
    description: 'Online payment updated successfully',
    type: OneOnlinePaymentResponseDto,
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
    description: 'Forbidden - You must be associated with a merchant to update online payments',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Online payment or online order not found',
    type: ErrorResponse,
  })
  @ApiConflictResponse({
    description: 'Conflict - Cannot update a deleted online payment',
    type: ErrorResponse,
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Online payment ID',
    example: 1,
  })
  @ApiBody({
    type: UpdateOnlinePaymentDto,
    description: 'Online payment update data',
    examples: {
      example1: {
        summary: 'Update payment status and processed date',
        value: {
          status: OnlineOrderPaymentStatus.PAID,
          processedAt: '2024-01-15T08:30:00Z',
        },
      },
      example2: {
        summary: 'Update amount',
        value: {
          amount: 150.00,
        },
      },
    },
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOnlinePaymentDto: UpdateOnlinePaymentDto,
    @Request() req: any,
  ) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.onlinePaymentService.update(id, updateOnlinePaymentDto, authenticatedUserMerchantId);
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
    summary: 'Delete an Online Payment',
    description: 'Performs a logical deletion of an online payment. The payment must belong to an online order that belongs to the authenticated user\'s merchant. Only portal administrators and merchant administrators can delete online payments.',
  })
  @ApiOkResponse({
    description: 'Online payment deleted successfully',
    type: OneOnlinePaymentResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - You must be associated with a merchant to delete online payments',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Online payment not found',
    type: ErrorResponse,
  })
  @ApiConflictResponse({
    description: 'Conflict - Online payment is already deleted',
    type: ErrorResponse,
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Online payment ID',
    example: 1,
  })
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.onlinePaymentService.remove(id, authenticatedUserMerchantId);
  }
}
