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
import { MarketingSegmentsService } from './marketing-segments.service';
import { CreateMarketingSegmentDto } from './dto/create-marketing-segment.dto';
import { UpdateMarketingSegmentDto } from './dto/update-marketing-segment.dto';
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
import { MarketingSegmentResponseDto, OneMarketingSegmentResponseDto } from './dto/marketing-segment-response.dto';
import { GetMarketingSegmentQueryDto } from './dto/get-marketing-segment-query.dto';
import { PaginatedMarketingSegmentResponseDto } from './dto/paginated-marketing-segment-response.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/constants/role.enum';
import { Scope } from 'src/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { MarketingSegmentType } from './constants/marketing-segment-type.enum';

@ApiTags('Marketing Segments')
@ApiBearerAuth()
@Controller('marketing-segments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MarketingSegmentsController {
  constructor(private readonly marketingSegmentsService: MarketingSegmentsService) {}

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
    summary: 'Create a new Marketing Segment',
    description: 'Creates a new marketing segment for the authenticated user\'s merchant. Only portal administrators and merchant administrators can create marketing segments.'
  })
  @ApiCreatedResponse({
    description: 'Marketing segment created successfully',
    type: OneMarketingSegmentResponseDto,
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
    description: 'Forbidden - You must be associated with a merchant to create marketing segments',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({ 
    description: 'Merchant not found',
    type: ErrorResponse,
  })
  @ApiBody({ 
    type: CreateMarketingSegmentDto,
    description: 'Marketing segment creation data',
    examples: {
      example1: {
        summary: 'Create automatic segment',
        value: {
          name: 'VIP Customers',
          type: 'automatic',
        }
      },
      example2: {
        summary: 'Create manual segment',
        value: {
          name: 'Holiday Promotions',
          type: 'manual',
        }
      }
    }
  })
  async create(
    @Body() dto: CreateMarketingSegmentDto,
    @Request() req: any,
  ): Promise<OneMarketingSegmentResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.marketingSegmentsService.create(dto, authenticatedUserMerchantId);
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
    summary: 'Get all Marketing Segments with pagination and filters',
    description: 'Retrieves a paginated list of marketing segments for the authenticated user\'s merchant. Supports filtering by type, name, and creation date.'
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
    name: 'type',
    required: false,
    enum: MarketingSegmentType,
    description: 'Filter by segment type',
    example: MarketingSegmentType.AUTOMATIC
  })
  @ApiQuery({
    name: 'name',
    required: false,
    type: String,
    description: 'Filter by segment name (partial match)',
    example: 'VIP'
  })
  @ApiQuery({
    name: 'createdDate',
    required: false,
    type: String,
    description: 'Filter by creation date (YYYY-MM-DD format)',
    example: '2023-10-01'
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['name', 'type', 'createdAt', 'updatedAt'],
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
    description: 'Paginated list of marketing segments retrieved successfully',
    type: PaginatedMarketingSegmentResponseDto,
  })
  @ApiUnauthorizedResponse({ 
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({ 
    description: 'Forbidden - User must be associated with a merchant to view marketing segments',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid query parameters',
    type: ErrorResponse,
  })
  async findAll(
    @Query() query: GetMarketingSegmentQueryDto,
    @Request() req: any,
  ): Promise<PaginatedMarketingSegmentResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.marketingSegmentsService.findAll(query, authenticatedUserMerchantId);
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
    summary: 'Get a Marketing Segment by ID',
    description: 'Retrieves a specific marketing segment by its ID. Users can only access marketing segments from their own merchant.'
  })
  @ApiParam({ name: 'id', type: Number, description: 'Marketing segment ID' })
  @ApiOkResponse({ 
    description: 'Marketing segment found successfully',
    type: OneMarketingSegmentResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden - You can only view marketing segments from your own merchant', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Marketing segment not found', type: ErrorResponse })
  @ApiBadRequestResponse({ description: 'Invalid marketing segment ID', type: ErrorResponse })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ): Promise<OneMarketingSegmentResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.marketingSegmentsService.findOne(id, authenticatedUserMerchantId);
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
    summary: 'Update a Marketing Segment by ID',
    description: 'Updates an existing marketing segment for the authenticated user\'s merchant. Only portal administrators and merchant administrators can update marketing segments. All fields are optional.'
  })
  @ApiParam({ 
    name: 'id', 
    type: Number, 
    description: 'Marketing segment ID to update',
    example: 1
  })
  @ApiOkResponse({ 
    description: 'Marketing segment updated successfully', 
    type: OneMarketingSegmentResponseDto,
  })
  @ApiUnauthorizedResponse({ 
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({ 
    description: 'Forbidden - You can only update marketing segments from your own merchant',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({ 
    description: 'Marketing segment not found',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid input data or ID',
    type: ErrorResponse,
  })
  @ApiBody({ 
    type: UpdateMarketingSegmentDto,
    description: 'Marketing segment update data (all fields optional)',
    examples: {
      example1: {
        summary: 'Update name',
        value: {
          name: 'VIP Customers Updated',
        }
      },
      example2: {
        summary: 'Update type',
        value: {
          type: 'manual',
        }
      }
    }
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMarketingSegmentDto,
    @Request() req: any,
  ): Promise<OneMarketingSegmentResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.marketingSegmentsService.update(id, dto, authenticatedUserMerchantId);
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
    summary: 'Soft delete a Marketing Segment by ID',
    description: 'Performs a soft delete by changing the marketing segment status to "deleted". Only merchant administrators can delete marketing segments from their own merchant.'
  })
  @ApiParam({ name: 'id', type: Number, description: 'Marketing segment ID to delete' })
  @ApiOkResponse({ 
    description: 'Marketing segment soft deleted successfully',
    type: OneMarketingSegmentResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden - You can only delete marketing segments from your own merchant', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Marketing segment not found', type: ErrorResponse })
  @ApiBadRequestResponse({ description: 'Invalid marketing segment ID', type: ErrorResponse })
  @ApiConflictResponse({ description: 'Marketing segment is already deleted', type: ErrorResponse })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ): Promise<OneMarketingSegmentResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.marketingSegmentsService.remove(id, authenticatedUserMerchantId);
  }
}
