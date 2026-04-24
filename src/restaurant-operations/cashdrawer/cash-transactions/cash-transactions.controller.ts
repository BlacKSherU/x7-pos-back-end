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

import { CashTransactionsService } from './cash-transactions.service';
import { CreateCashTransactionDto } from './dto/create-cash-transaction.dto';
import { UpdateCashTransactionDto } from './dto/update-cash-transaction.dto';
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
import { AuthenticatedUser } from '../../../auth/interfaces/authenticated-user.interface';
import {
  OneCashTransactionResponseDto,
  PaginatedCashTransactionsResponseDto,
} from './dto/cash-transaction-response.dto';
import {
  GetCashTransactionsQueryDto,
  CashTransactionSortBy,
} from './dto/get-cash-transactions-query.dto';
import { ErrorResponse } from '../../../common/dtos/error-response.dto';
import { CashTransactionType } from './constants/cash-transaction-type.enum';
import { CashTransactionStatus } from './constants/cash-transaction-status.enum';

@ApiTags('Cash Transactions')
@ApiBearerAuth()
@ApiExtraModels(ErrorResponse)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
@Controller('cash-transactions')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.CASH_TRANSACTIONS)
export class CashTransactionsController {
  constructor(
    private readonly cashTransactionsService: CashTransactionsService,
  ) {}

  @Post()
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Create a new cash transaction',
    description:
      'Creates a new cash transaction. The transaction type determines how the cash drawer balance is updated. Order ID is optional and only required for certain transaction types like sale or refund.',
  })
  @ApiBody({ type: CreateCashTransactionDto })
  @ApiCreatedResponse({
    description: 'Cash transaction created successfully',
    type: OneCashTransactionResponseDto,
    example: {
      statusCode: 201,
      message: 'Cash transaction created successfully',
      data: {
        id: 1,
        cashDrawerId: 10,
        orderId: 200,
        type: 'sale',
        amount: 125.5,
        collaboratorId: 5,
        status: 'active',
        notes: 'Some notes about the transaction',
        createdAt: '2024-01-15T08:00:00Z',
        updatedAt: '2024-01-15T08:00:00Z',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid data', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({
    description: 'Related resource not found',
    type: ErrorResponse,
  })
  async create(
    @Body() dto: CreateCashTransactionDto,
    @Request() req: AuthenticatedUser,
  ): Promise<OneCashTransactionResponseDto> {
    const authenticatedUserMerchantId = req.merchant?.id;
    return this.cashTransactionsService.create(
      dto,
      authenticatedUserMerchantId,
    );
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
    summary: 'Get all cash transactions',
    description:
      "Retrieves all cash transactions for the authenticated user's merchant with filtering and pagination support.",
  })
  @ApiQuery({
    name: 'cashDrawerId',
    required: false,
    type: Number,
    description: 'Filter by cash drawer ID',
  })
  @ApiQuery({
    name: 'orderId',
    required: false,
    type: Number,
    description: 'Filter by order ID',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: CashTransactionType,
    description:
      'Filter by transaction type (opening, sale, refund, tip, withdrawal, adjustment_up, adjustment_down, close, pause)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: CashTransactionStatus,
    description: 'Filter by transaction status (active, deleted)',
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
    enum: CashTransactionSortBy,
    description: 'Field to sort by',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Sort order',
  })
  @ApiOkResponse({
    description: 'Cash transactions retrieved successfully',
    type: PaginatedCashTransactionsResponseDto,
    example: {
      statusCode: 200,
      message: 'Cash transactions retrieved successfully',
      data: [
        {
          id: 1,
          cashDrawerId: 10,
          orderId: 200,
          type: 'sale',
          amount: 125.5,
          collaboratorId: 5,
          status: 'active',
          notes: 'Some notes',
          createdAt: '2024-01-15T08:00:00Z',
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
  })
  @ApiBadRequestResponse({ description: 'Invalid query', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  async findAll(
    @Query() query: GetCashTransactionsQueryDto,
    @Request() req: AuthenticatedUser,
  ): Promise<PaginatedCashTransactionsResponseDto> {
    const authenticatedUserMerchantId = req.merchant?.id;
    return this.cashTransactionsService.findAll(
      query,
      authenticatedUserMerchantId,
    );
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
    summary: 'Get a cash transaction by ID',
    description:
      "Retrieves a specific cash transaction by ID. Only transactions from the authenticated user's merchant can be accessed.",
  })
  @ApiParam({ name: 'id', type: Number, description: 'Cash transaction ID' })
  @ApiOkResponse({
    description: 'Cash transaction retrieved successfully',
    type: OneCashTransactionResponseDto,
    example: {
      statusCode: 200,
      message: 'Cash transaction retrieved successfully',
      data: {
        id: 1,
        cashDrawerId: 10,
        orderId: 200,
        type: 'sale',
        amount: 125.5,
        collaboratorId: 5,
        status: 'active',
        notes: 'Some notes',
        createdAt: '2024-01-15T08:00:00Z',
        updatedAt: '2024-01-15T08:00:00Z',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid id', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Not found', type: ErrorResponse })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedUser,
  ): Promise<OneCashTransactionResponseDto> {
    const authenticatedUserMerchantId = req.merchant?.id;
    return this.cashTransactionsService.findOne(
      id,
      authenticatedUserMerchantId,
    );
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
    summary: 'Update a cash transaction',
    description:
      "Updates a specific cash transaction by ID. Only transactions from the authenticated user's merchant can be updated.",
  })
  @ApiParam({ name: 'id', type: Number, description: 'Cash transaction ID' })
  @ApiBody({ type: UpdateCashTransactionDto })
  @ApiOkResponse({
    description: 'Cash transaction updated successfully',
    type: OneCashTransactionResponseDto,
    example: {
      statusCode: 200,
      message: 'Cash transaction updated successfully',
      data: {
        id: 1,
        cashDrawerId: 10,
        orderId: 200,
        type: 'sale',
        amount: 150.0,
        collaboratorId: 5,
        status: 'active',
        notes: 'Updated notes',
        createdAt: '2024-01-15T08:00:00Z',
        updatedAt: '2024-01-15T09:00:00Z',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid data', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Not found', type: ErrorResponse })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCashTransactionDto,
    @Request() req: AuthenticatedUser,
  ): Promise<OneCashTransactionResponseDto> {
    const authenticatedUserMerchantId = req.merchant?.id;
    return this.cashTransactionsService.update(
      id,
      dto,
      authenticatedUserMerchantId,
    );
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
    summary: 'Delete a cash transaction (logical)',
    description:
      "Performs a logical deletion of a cash transaction by setting its status to deleted. Only transactions from the authenticated user's merchant can be deleted.",
  })
  @ApiParam({ name: 'id', type: Number, description: 'Cash transaction ID' })
  @ApiOkResponse({
    description: 'Cash transaction deleted successfully',
    type: OneCashTransactionResponseDto,
    example: {
      statusCode: 200,
      message: 'Cash transaction deleted successfully',
      data: {
        id: 1,
        cashDrawerId: 10,
        orderId: 200,
        type: 'sale',
        amount: 125.5,
        collaboratorId: 5,
        status: 'deleted',
        notes: 'Some notes',
        createdAt: '2024-01-15T08:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid id', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Not found', type: ErrorResponse })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedUser,
  ): Promise<OneCashTransactionResponseDto> {
    const authenticatedUserMerchantId = req.merchant?.id;
    return this.cashTransactionsService.remove(id, authenticatedUserMerchantId);
  }
}
