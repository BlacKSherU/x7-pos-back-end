import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { LoyaltyPointsTransactionService } from './loyalty-points-transaction.service';
import { CreateLoyaltyPointsTransactionDto } from './dto/create-loyalty-points-transaction.dto';
import { UpdateLoyaltyPointsTransactionDto } from './dto/update-loyalty-points-transaction.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { GetLoyaltyPointsTransactionQueryDto } from './dto/get-loyalty-points-transaction-query.dto';
import { AllPaginatedLoyaltyPointsTransactionDto } from './dto/all-paginated-loyalty-points-transaction.dto';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/constants/role.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { Scope } from 'src/users/constants/scope.enum';
import {
  LoyaltyPointsTransactionResponseDto,
  OneLoyaltyPointsTransactionResponse,
} from './dto/loyalty-points-transaction-response.dto';

@ApiExtraModels(ErrorResponse)
@ApiBearerAuth()
@ApiTags('Loyalty Points Transactions')
@Controller('loyalty-points-transactions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LoyaltyPointsTransactionController {
  constructor(
    private readonly loyaltyPointsTransactionService: LoyaltyPointsTransactionService,
  ) {}

  @Post()
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Create a new Loyalty Points Transaction' })
  @ApiCreatedResponse({
    description: 'Loyalty Points Transaction created successfully',
    type: LoyaltyPointsTransactionResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Bad Request',
    type: ErrorResponse,
  })
  @ApiConflictResponse({
    description: 'Loyalty Points Transaction already exists',
  })
  @ApiBody({ type: CreateLoyaltyPointsTransactionDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    createLoyaltyPointsTransactionDto: CreateLoyaltyPointsTransactionDto,
  ): Promise<OneLoyaltyPointsTransactionResponse> {
    const merchantId = user.merchant.id;
    return this.loyaltyPointsTransactionService.create(
      merchantId,
      createLoyaltyPointsTransactionDto,
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
    summary: 'Get all loyalty points transactions with pagination and filters',
    description:
      'Retrieves a paginated list of loyalty points transactions with optional filters. Users can only see loyalty points transactions from their own merchant.',
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
  @ApiOkResponse({
    description:
      'Paginated list of loyalty points transactions retrieved successfully',
    type: AllPaginatedLoyaltyPointsTransactionDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiNotFoundResponse({
    description: 'Merchant not found',
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters or business rule violation',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: ErrorResponse,
  })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetLoyaltyPointsTransactionQueryDto,
  ): Promise<AllPaginatedLoyaltyPointsTransactionDto> {
    const merchantId = user.merchant.id;
    return this.loyaltyPointsTransactionService.findAll(query, merchantId);
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
  @ApiOperation({ summary: 'Get a Loyalty Points Transaction by ID' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Loyalty Points Transaction ID',
  })
  @ApiOkResponse({
    description: 'Loyalty Points Transaction found',
    type: LoyaltyPointsTransactionResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Loyalty Points Transaction not found' })
  @ApiResponse({
    status: 400,
    description: 'Invalid ID',
    type: ErrorResponse,
  })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OneLoyaltyPointsTransactionResponse> {
    const merchantId = user.merchant.id;
    return this.loyaltyPointsTransactionService.findOne(id, merchantId);
  }

  @Patch(':id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Update a Loyalty Points Transaction' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Loyalty Points Transaction ID',
  })
  @ApiBody({ type: UpdateLoyaltyPointsTransactionDto })
  @ApiOkResponse({
    description: 'Loyalty Points Transaction updated successfully',
    type: LoyaltyPointsTransactionResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Loyalty Points Transaction not found' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body()
    updateLoyaltyPointsTransactionDto: UpdateLoyaltyPointsTransactionDto,
  ): Promise<OneLoyaltyPointsTransactionResponse> {
    const merchantId = user.merchant.id;
    return this.loyaltyPointsTransactionService.update(
      id,
      merchantId,
      updateLoyaltyPointsTransactionDto,
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
  @ApiOperation({ summary: 'Delete a Loyalty Points Transaction' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Loyalty Points Transaction ID',
  })
  @ApiOkResponse({ description: 'Loyalty Points Transaction deleted' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Loyalty Points Transaction not found' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OneLoyaltyPointsTransactionResponse> {
    const merchantId = user.merchant.id;
    return this.loyaltyPointsTransactionService.remove(id, merchantId);
  }
}
