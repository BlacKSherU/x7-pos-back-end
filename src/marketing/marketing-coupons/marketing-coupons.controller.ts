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
import { MarketingCouponsService } from './marketing-coupons.service';
import { CreateMarketingCouponDto } from './dto/create-marketing-coupon.dto';
import { UpdateMarketingCouponDto } from './dto/update-marketing-coupon.dto';
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
import { MarketingCouponResponseDto, OneMarketingCouponResponseDto, PaginatedMarketingCouponResponseDto } from './dto/marketing-coupon-response.dto';
import { GetMarketingCouponQueryDto } from './dto/get-marketing-coupon-query.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/constants/role.enum';
import { Scope } from 'src/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { MarketingCouponType } from './constants/marketing-coupon-type.enum';
import { MarketingCouponAppliesTo } from './constants/marketing-coupon-applies-to.enum';

@ApiTags('Marketing Coupons')
@ApiBearerAuth()
@Controller('marketing-coupons')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MarketingCouponsController {
  constructor(private readonly marketingCouponsService: MarketingCouponsService) {}

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
    summary: 'Create a new Marketing Coupon',
    description: 'Creates a new marketing coupon for the authenticated user\'s merchant. Only portal administrators and merchant administrators can create marketing coupons.'
  })
  @ApiCreatedResponse({
    description: 'Marketing coupon created successfully',
    type: OneMarketingCouponResponseDto,
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
    description: 'Forbidden - You must be associated with a merchant to create marketing coupons',
    type: ErrorResponse,
  })
  @ApiConflictResponse({ 
    description: 'Conflict - A coupon with this code already exists',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({ 
    description: 'Merchant not found',
    type: ErrorResponse,
  })
  @ApiBody({ 
    type: CreateMarketingCouponDto,
    description: 'Marketing coupon creation data',
    examples: {
      example1: {
        summary: 'Create percentage coupon',
        value: {
          code: 'SUMMER2024',
          type: MarketingCouponType.PERCENTAGE,
          percentage: 15,
          appliesTo: MarketingCouponAppliesTo.ALL,
          maxUses: 100,
          validFrom: '2024-01-01T00:00:00Z',
          validUntil: '2024-12-31T23:59:59Z',
        }
      },
      example2: {
        summary: 'Create fixed amount coupon',
        value: {
          code: 'SAVE10',
          type: MarketingCouponType.FIXED,
          amount: 10.50,
          appliesTo: MarketingCouponAppliesTo.ALL,
          minOrderAmount: 50.00,
        }
      }
    }
  })
  async create(
    @Body() dto: CreateMarketingCouponDto,
    @Request() req: any,
  ): Promise<OneMarketingCouponResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.marketingCouponsService.create(dto, authenticatedUserMerchantId);
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
    summary: 'Get all Marketing Coupons with pagination and filters',
    description: 'Retrieves a paginated list of marketing coupons for the authenticated user\'s merchant. Supports filtering by code, type, applies to, and dates.'
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
    name: 'code',
    required: false,
    type: String,
    description: 'Filter by coupon code (partial match)',
    example: 'SUMMER'
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: MarketingCouponType,
    description: 'Filter by coupon type',
    example: MarketingCouponType.PERCENTAGE
  })
  @ApiQuery({
    name: 'appliesTo',
    required: false,
    enum: MarketingCouponAppliesTo,
    description: 'Filter by applies to',
    example: MarketingCouponAppliesTo.ALL
  })
  @ApiQuery({
    name: 'createdDate',
    required: false,
    type: String,
    description: 'Filter by creation date (YYYY-MM-DD format)',
    example: '2024-01-01'
  })
  @ApiQuery({
    name: 'validFrom',
    required: false,
    type: String,
    description: 'Filter by valid from date (YYYY-MM-DD format)',
    example: '2024-01-01'
  })
  @ApiQuery({
    name: 'validUntil',
    required: false,
    type: String,
    description: 'Filter by valid until date (YYYY-MM-DD format)',
    example: '2024-12-31'
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['code', 'type', 'createdAt', 'updatedAt', 'validFrom', 'validUntil'],
    description: 'Field to sort by',
    example: 'createdAt'
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Sort order',
    example: 'DESC'
  })
  @ApiOkResponse({ 
    description: 'Paginated list of marketing coupons retrieved successfully',
    type: PaginatedMarketingCouponResponseDto,
  })
  @ApiUnauthorizedResponse({ 
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({ 
    description: 'Forbidden - User must be associated with a merchant to view marketing coupons',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid query parameters',
    type: ErrorResponse,
  })
  async findAll(
    @Query() query: GetMarketingCouponQueryDto,
    @Request() req: any,
  ): Promise<PaginatedMarketingCouponResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.marketingCouponsService.findAll(query, authenticatedUserMerchantId);
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
    summary: 'Get a Marketing Coupon by ID',
    description: 'Retrieves a specific marketing coupon by its ID. Users can only access marketing coupons from their own merchant.'
  })
  @ApiParam({ name: 'id', type: Number, description: 'Marketing coupon ID' })
  @ApiOkResponse({ 
    description: 'Marketing coupon found successfully',
    type: OneMarketingCouponResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden - You can only view marketing coupons from your own merchant', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Marketing coupon not found', type: ErrorResponse })
  @ApiBadRequestResponse({ description: 'Invalid marketing coupon ID', type: ErrorResponse })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ): Promise<OneMarketingCouponResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.marketingCouponsService.findOne(id, authenticatedUserMerchantId);
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
    summary: 'Update a Marketing Coupon by ID',
    description: 'Updates an existing marketing coupon for the authenticated user\'s merchant. Only portal administrators and merchant administrators can update marketing coupons. All fields are optional.'
  })
  @ApiParam({ 
    name: 'id', 
    type: Number, 
    description: 'Marketing coupon ID to update',
    example: 1
  })
  @ApiOkResponse({ 
    description: 'Marketing coupon updated successfully', 
    type: OneMarketingCouponResponseDto,
  })
  @ApiUnauthorizedResponse({ 
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({ 
    description: 'Forbidden - You can only update marketing coupons from your own merchant',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({ 
    description: 'Marketing coupon not found',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid input data or ID',
    type: ErrorResponse,
  })
  @ApiConflictResponse({ 
    description: 'Conflict - A coupon with this code already exists',
    type: ErrorResponse,
  })
  @ApiBody({ 
    type: UpdateMarketingCouponDto,
    description: 'Marketing coupon update data (all fields optional)',
    examples: {
      example1: {
        summary: 'Update code and percentage',
        value: {
          code: 'WINTER2024',
          percentage: 20,
        }
      },
      example2: {
        summary: 'Update valid dates',
        value: {
          validFrom: '2024-06-01T00:00:00Z',
          validUntil: '2024-08-31T23:59:59Z',
        }
      }
    }
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMarketingCouponDto,
    @Request() req: any,
  ): Promise<OneMarketingCouponResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.marketingCouponsService.update(id, dto, authenticatedUserMerchantId);
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
    summary: 'Soft delete a Marketing Coupon by ID',
    description: 'Performs a soft delete by changing the marketing coupon status to "deleted". Only merchant administrators can delete marketing coupons from their own merchant.'
  })
  @ApiParam({ name: 'id', type: Number, description: 'Marketing coupon ID to delete' })
  @ApiOkResponse({ 
    description: 'Marketing coupon soft deleted successfully',
    type: OneMarketingCouponResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden - You can only delete marketing coupons from your own merchant', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Marketing coupon not found', type: ErrorResponse })
  @ApiBadRequestResponse({ description: 'Invalid marketing coupon ID', type: ErrorResponse })
  @ApiConflictResponse({ description: 'Marketing coupon is already deleted', type: ErrorResponse })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ): Promise<OneMarketingCouponResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.marketingCouponsService.remove(id, authenticatedUserMerchantId);
  }
}
