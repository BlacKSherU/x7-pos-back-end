import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
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
import { LoyaltyCustomerService } from './loyalty-customer.service';
import { CreateLoyaltyCustomerDto } from './dto/create-loyalty-customer.dto';
import { UpdateLoyaltyCustomerDto } from './dto/update-loyalty-customer.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../users/constants/role.enum';
import { Scope } from '../../users/constants/scope.enum';
import { Scopes } from '../../auth/decorators/scopes.decorator';
import { LoyaltyCustomer } from './entities/loyalty-customer.entity';
import { ErrorResponse } from '../../common/dtos/error-response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { GetLoyaltyCustomersQueryDto } from './dto/get-loyalty-customers-query.dto';
import { AllPaginatedLoyaltyCustomerDto } from './dto/all-paginated-loyalty-customer.dto';
import { OneLoyaltyCustomerResponse } from './dto/loyalty-customer-response.dto';

@ApiExtraModels(ErrorResponse)
@ApiBearerAuth()
@ApiTags('Loyalty Customers')
@Controller('loyalty-customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LoyaltyCustomerController {
  constructor(
    private readonly loyaltyCustomerService: LoyaltyCustomerService,
  ) {}

  @Post()
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Create a new Loyalty Customer' })
  @ApiCreatedResponse({
    description: 'Loyalty Customer created successfully',
    type: LoyaltyCustomer,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({ description: 'Loyalty Customer already exists' })
  @ApiBody({ type: CreateLoyaltyCustomerDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createLoyaltyCustomerDto: CreateLoyaltyCustomerDto,
  ): Promise<OneLoyaltyCustomerResponse> {
    const merchantId = user.merchant.id;
    return this.loyaltyCustomerService.create(
      merchantId,
      createLoyaltyCustomerDto,
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
    summary: 'Get all loyalty customers with pagination and filters',
    description:
      'Retrieves a paginated list of loyalty customers with optional filters. Users can only see loyalty customers from their own merchant.',
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
    description: 'Paginated list of loyalty customers retrieved successfully',
    type: AllPaginatedLoyaltyCustomerDto,
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
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetLoyaltyCustomersQueryDto,
  ): Promise<AllPaginatedLoyaltyCustomerDto> {
    const merchantId = user.merchant.id;
    return this.loyaltyCustomerService.findAll(query, merchantId);
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
  @ApiOperation({ summary: 'Get a Loyalty Customer by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Loyalty Customer ID' })
  @ApiOkResponse({
    description: 'Loyalty Customer found',
    type: LoyaltyCustomer,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Loyalty Customer not found' })
  @ApiResponse({
    status: 404,
    description: 'Loyalty Customer not found',
    type: ErrorResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid ID',
    type: ErrorResponse,
  })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OneLoyaltyCustomerResponse> {
    const merchantId = user.merchant.id;
    return this.loyaltyCustomerService.findOne(id, merchantId);
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
  @ApiOperation({ summary: 'Update a Loyalty Customer' })
  @ApiParam({ name: 'id', type: Number, description: 'Loyalty Customer ID' })
  @ApiBody({ type: UpdateLoyaltyCustomerDto })
  @ApiOkResponse({
    description: 'Loyalty Customer updated successfully',
    type: LoyaltyCustomer,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Loyalty Customer not found' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiResponse({
    status: 404,
    description: 'Loyalty Customer not found',
    type: ErrorResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request',
    type: ErrorResponse,
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLoyaltyCustomerDto: UpdateLoyaltyCustomerDto,
  ): Promise<OneLoyaltyCustomerResponse> {
    const merchantId = user.merchant.id;
    return this.loyaltyCustomerService.update(
      id,
      merchantId,
      updateLoyaltyCustomerDto,
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
  @ApiOperation({ summary: 'Delete a Loyalty Customer' })
  @ApiParam({ name: 'id', type: Number, description: 'Loyalty Customer ID' })
  @ApiOkResponse({ description: 'Loyalty Customer deleted' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Loyalty Customer not found' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiResponse({
    status: 404,
    description: 'Loyalty Customer not found',
    type: ErrorResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid ID',
    type: ErrorResponse,
  })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OneLoyaltyCustomerResponse> {
    const merchantId = user.merchant.id;
    return this.loyaltyCustomerService.remove(id, merchantId);
  }
}
