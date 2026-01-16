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
import { MarketingCampaignService } from './marketing_campaing.service';
import { CreateMarketingCampaignDto } from './dto/create-marketing_campaing.dto';
import { UpdateMarketingCampaignDto } from './dto/update-marketing_campaing.dto';
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
import { MarketingCampaignResponseDto, OneMarketingCampaignResponseDto } from './dto/marketing-campaign-response.dto';
import { GetMarketingCampaignQueryDto } from './dto/get-marketing-campaign-query.dto';
import { PaginatedMarketingCampaignResponseDto } from './dto/paginated-marketing-campaign-response.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/constants/role.enum';
import { Scope } from 'src/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { MarketingCampaignStatus } from './constants/marketing-campaign-status.enum';
import { MarketingCampaignChannel } from './constants/marketing-campaign-channel.enum';

@ApiTags('Marketing Campaigns')
@ApiBearerAuth()
@Controller('marketing-campaigns')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MarketingCampaignController {
  constructor(private readonly marketingCampaignService: MarketingCampaignService) {}

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
    summary: 'Create a new Marketing Campaign',
    description: 'Creates a new marketing campaign for the authenticated user\'s merchant. Only portal administrators and merchant administrators can create marketing campaigns.'
  })
  @ApiCreatedResponse({
    description: 'Marketing campaign created successfully',
    type: OneMarketingCampaignResponseDto,
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
    description: 'Forbidden - You must be associated with a merchant to create marketing campaigns',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({ 
    description: 'Merchant not found',
    type: ErrorResponse,
  })
  @ApiBody({ 
    type: CreateMarketingCampaignDto,
    description: 'Marketing campaign creation data',
    examples: {
      example1: {
        summary: 'Create email campaign',
        value: {
          name: 'Summer Sale Campaign',
          channel: 'email',
          content: 'Get 20% off on all items this summer!',
          scheduledAt: '2023-12-01T10:00:00Z',
        }
      },
      example2: {
        summary: 'Create SMS campaign',
        value: {
          name: 'Flash Sale',
          channel: 'sms',
          content: 'Flash sale! 50% off today only!',
        }
      }
    }
  })
  async create(
    @Body() dto: CreateMarketingCampaignDto,
    @Request() req: any,
  ): Promise<OneMarketingCampaignResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.marketingCampaignService.create(dto, authenticatedUserMerchantId);
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
    summary: 'Get all Marketing Campaigns with pagination and filters',
    description: 'Retrieves a paginated list of marketing campaigns for the authenticated user\'s merchant. Supports filtering by channel, status, name, and creation date.'
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
    name: 'channel',
    required: false,
    enum: MarketingCampaignChannel,
    description: 'Filter by channel',
    example: MarketingCampaignChannel.EMAIL
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: MarketingCampaignStatus,
    description: 'Filter by status',
    example: MarketingCampaignStatus.DRAFT
  })
  @ApiQuery({
    name: 'name',
    required: false,
    type: String,
    description: 'Filter by campaign name (partial match)',
    example: 'Summer'
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
    enum: ['name', 'channel', 'status', 'scheduledAt', 'createdAt', 'updatedAt'],
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
    description: 'Paginated list of marketing campaigns retrieved successfully',
    type: PaginatedMarketingCampaignResponseDto,
  })
  @ApiUnauthorizedResponse({ 
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({ 
    description: 'Forbidden - User must be associated with a merchant to view marketing campaigns',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid query parameters',
    type: ErrorResponse,
  })
  async findAll(
    @Query() query: GetMarketingCampaignQueryDto,
    @Request() req: any,
  ): Promise<PaginatedMarketingCampaignResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.marketingCampaignService.findAll(query, authenticatedUserMerchantId);
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
    summary: 'Get a Marketing Campaign by ID',
    description: 'Retrieves a specific marketing campaign by its ID. Users can only access marketing campaigns from their own merchant.'
  })
  @ApiParam({ name: 'id', type: Number, description: 'Marketing campaign ID' })
  @ApiOkResponse({ 
    description: 'Marketing campaign found successfully',
    type: OneMarketingCampaignResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden - You can only view marketing campaigns from your own merchant', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Marketing campaign not found', type: ErrorResponse })
  @ApiBadRequestResponse({ description: 'Invalid marketing campaign ID', type: ErrorResponse })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ): Promise<OneMarketingCampaignResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.marketingCampaignService.findOne(id, authenticatedUserMerchantId);
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
    summary: 'Update a Marketing Campaign by ID',
    description: 'Updates an existing marketing campaign for the authenticated user\'s merchant. Only portal administrators and merchant administrators can update marketing campaigns. All fields are optional.'
  })
  @ApiParam({ 
    name: 'id', 
    type: Number, 
    description: 'Marketing campaign ID to update',
    example: 1
  })
  @ApiOkResponse({ 
    description: 'Marketing campaign updated successfully', 
    type: OneMarketingCampaignResponseDto,
  })
  @ApiUnauthorizedResponse({ 
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({ 
    description: 'Forbidden - You can only update marketing campaigns from your own merchant',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({ 
    description: 'Marketing campaign not found',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid input data or ID',
    type: ErrorResponse,
  })
  @ApiBody({ 
    type: UpdateMarketingCampaignDto,
    description: 'Marketing campaign update data (all fields optional)',
    examples: {
      example1: {
        summary: 'Update name and status',
        value: {
          name: 'Summer Sale Campaign Updated',
          status: 'scheduled',
        }
      },
      example2: {
        summary: 'Update content and schedule',
        value: {
          content: 'Updated content for the campaign',
          scheduledAt: '2023-12-15T10:00:00Z',
        }
      }
    }
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMarketingCampaignDto,
    @Request() req: any,
  ): Promise<OneMarketingCampaignResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.marketingCampaignService.update(id, dto, authenticatedUserMerchantId);
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
    summary: 'Soft delete a Marketing Campaign by ID',
    description: 'Performs a soft delete by changing the marketing campaign status to "deleted". Only merchant administrators can delete marketing campaigns from their own merchant.'
  })
  @ApiParam({ name: 'id', type: Number, description: 'Marketing campaign ID to delete' })
  @ApiOkResponse({ 
    description: 'Marketing campaign soft deleted successfully',
    type: OneMarketingCampaignResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden - You can only delete marketing campaigns from your own merchant', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Marketing campaign not found', type: ErrorResponse })
  @ApiBadRequestResponse({ description: 'Invalid marketing campaign ID', type: ErrorResponse })
  @ApiConflictResponse({ description: 'Marketing campaign is already deleted', type: ErrorResponse })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ): Promise<OneMarketingCampaignResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.marketingCampaignService.remove(id, authenticatedUserMerchantId);
  }
}
