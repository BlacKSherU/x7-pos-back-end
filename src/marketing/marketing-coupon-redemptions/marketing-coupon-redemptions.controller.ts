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
import { MarketingCouponRedemptionsService } from './marketing-coupon-redemptions.service';
import { CreateMarketingCouponRedemptionDto } from './dto/create-marketing-coupon-redemption.dto';
import { UpdateMarketingCouponRedemptionDto } from './dto/update-marketing-coupon-redemption.dto';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiBody,
  ApiForbiddenResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { MarketingCouponRedemptionResponseDto, OneMarketingCouponRedemptionResponseDto, PaginatedMarketingCouponRedemptionResponseDto } from './dto/marketing-coupon-redemption-response.dto';
import { GetMarketingCouponRedemptionQueryDto } from './dto/get-marketing-coupon-redemption-query.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/constants/role.enum';
import { Scope } from 'src/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';

@ApiTags('Marketing Coupon Redemptions')
@ApiBearerAuth()
@Controller('marketing-coupon-redemptions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MarketingCouponRedemptionsController {
  constructor(private readonly marketingCouponRedemptionsService: MarketingCouponRedemptionsService) {}

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
    summary: 'Create a new Marketing Coupon Redemption',
    description: 'Creates a new marketing coupon redemption for the authenticated user\'s merchant. Only portal administrators and merchant administrators can create marketing coupon redemptions.'
  })
  @ApiCreatedResponse({
    description: 'Marketing coupon redemption created successfully',
    type: OneMarketingCouponRedemptionResponseDto,
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
    description: 'Forbidden - You must be associated with a merchant to create marketing coupon redemptions',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({ 
    description: 'Marketing coupon, order, or customer not found',
    type: ErrorResponse,
  })
  @ApiBody({ 
    type: CreateMarketingCouponRedemptionDto,
    description: 'Marketing coupon redemption creation data',
    examples: {
      example1: {
        summary: 'Create redemption',
        value: {
          couponId: 1,
          orderId: 1,
          customerId: 1,
          discountApplied: 10.50,
        }
      },
      example2: {
        summary: 'Create redemption with custom date',
        value: {
          couponId: 1,
          orderId: 1,
          customerId: 1,
          redeemedAt: '2024-01-15T10:00:00Z',
          discountApplied: 15.00,
        }
      }
    }
  })
  async create(
    @Body() dto: CreateMarketingCouponRedemptionDto,
    @Request() req: any,
  ): Promise<OneMarketingCouponRedemptionResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.marketingCouponRedemptionsService.create(dto, authenticatedUserMerchantId);
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
    summary: 'Get all Marketing Coupon Redemptions with pagination and filters',
    description: 'Retrieves a paginated list of marketing coupon redemptions for the authenticated user\'s merchant. Supports filtering by coupon ID, order ID, customer ID, and dates.'
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination (minimum 1)',
    example: 1
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (1-100)',
    example: 10
  })
  @ApiQuery({
    name: 'couponId',
    required: false,
    type: Number,
    description: 'Filter by coupon ID',
    example: 1
  })
  @ApiQuery({
    name: 'orderId',
    required: false,
    type: Number,
    description: 'Filter by order ID',
    example: 1
  })
  @ApiQuery({
    name: 'customerId',
    required: false,
    type: Number,
    description: 'Filter by customer ID',
    example: 1
  })
  @ApiQuery({
    name: 'redeemedDate',
    required: false,
    type: String,
    description: 'Filter by redemption date (YYYY-MM-DD format)',
    example: '2024-01-15'
  })
  @ApiQuery({
    name: 'createdDate',
    required: false,
    type: String,
    description: 'Filter by creation date (YYYY-MM-DD format)',
    example: '2024-01-15'
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['redeemedAt', 'discountApplied', 'createdAt', 'updatedAt'],
    description: 'Field to sort by',
    example: 'redeemedAt'
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Sort order',
    example: 'DESC'
  })
  @ApiOkResponse({ 
    description: 'Paginated list of marketing coupon redemptions retrieved successfully',
    type: PaginatedMarketingCouponRedemptionResponseDto,
  })
  @ApiUnauthorizedResponse({ 
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({ 
    description: 'Forbidden - User must be associated with a merchant to view marketing coupon redemptions',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid query parameters',
    type: ErrorResponse,
  })
  async findAll(
    @Query() query: GetMarketingCouponRedemptionQueryDto,
    @Request() req: any,
  ): Promise<PaginatedMarketingCouponRedemptionResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.marketingCouponRedemptionsService.findAll(query, authenticatedUserMerchantId);
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
    summary: 'Get a Marketing Coupon Redemption by ID',
    description: 'Retrieves a specific marketing coupon redemption by its ID. Users can only access marketing coupon redemptions from their own merchant.'
  })
  @ApiParam({ name: 'id', type: Number, description: 'Marketing coupon redemption ID' })
  @ApiOkResponse({ 
    description: 'Marketing coupon redemption found successfully',
    type: OneMarketingCouponRedemptionResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden - You can only view marketing coupon redemptions from your own merchant', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Marketing coupon redemption not found', type: ErrorResponse })
  @ApiBadRequestResponse({ description: 'Invalid marketing coupon redemption ID', type: ErrorResponse })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ): Promise<OneMarketingCouponRedemptionResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.marketingCouponRedemptionsService.findOne(id, authenticatedUserMerchantId);
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
    summary: 'Update a Marketing Coupon Redemption by ID',
    description: 'Updates an existing marketing coupon redemption for the authenticated user\'s merchant. Only portal administrators and merchant administrators can update marketing coupon redemptions. All fields are optional.'
  })
  @ApiParam({ 
    name: 'id', 
    type: Number, 
    description: 'Marketing coupon redemption ID to update',
    example: 1
  })
  @ApiOkResponse({ 
    description: 'Marketing coupon redemption updated successfully', 
    type: OneMarketingCouponRedemptionResponseDto,
  })
  @ApiUnauthorizedResponse({ 
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({ 
    description: 'Forbidden - You can only update marketing coupon redemptions from your own merchant',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({ 
    description: 'Marketing coupon redemption not found',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid input data or ID',
    type: ErrorResponse,
  })
  @ApiBody({ 
    type: UpdateMarketingCouponRedemptionDto,
    description: 'Marketing coupon redemption update data (all fields optional)',
    examples: {
      example1: {
        summary: 'Update discount applied',
        value: {
          discountApplied: 20.00,
        }
      },
      example2: {
        summary: 'Update redemption date',
        value: {
          redeemedAt: '2024-01-16T10:00:00Z',
        }
      }
    }
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMarketingCouponRedemptionDto,
    @Request() req: any,
  ): Promise<OneMarketingCouponRedemptionResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.marketingCouponRedemptionsService.update(id, dto, authenticatedUserMerchantId);
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
  @ApiOperation({ 
    summary: 'Soft delete a Marketing Coupon Redemption by ID',
    description: 'Performs a soft delete by changing the marketing coupon redemption status to "deleted". Only merchant administrators can delete marketing coupon redemptions from their own merchant.'
  })
  @ApiParam({ name: 'id', type: Number, description: 'Marketing coupon redemption ID to delete' })
  @ApiOkResponse({ 
    description: 'Marketing coupon redemption soft deleted successfully',
    type: OneMarketingCouponRedemptionResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden - You can only delete marketing coupon redemptions from your own merchant', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Marketing coupon redemption not found', type: ErrorResponse })
  @ApiBadRequestResponse({ description: 'Invalid marketing coupon redemption ID', type: ErrorResponse })
  @ApiConflictResponse({ description: 'Marketing coupon redemption is already deleted', type: ErrorResponse })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ): Promise<OneMarketingCouponRedemptionResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.marketingCouponRedemptionsService.remove(id, authenticatedUserMerchantId);
  }
}
