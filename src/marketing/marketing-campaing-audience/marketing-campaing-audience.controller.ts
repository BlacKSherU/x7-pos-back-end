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
import { MarketingCampaingAudienceService } from './marketing-campaing-audience.service';
import { CreateMarketingCampaignAudienceDto } from './dto/create-marketing-campaing-audience.dto';
import { UpdateMarketingCampaignAudienceDto } from './dto/update-marketing-campaing-audience.dto';
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
import { MarketingCampaignAudienceResponseDto, OneMarketingCampaignAudienceResponseDto } from './dto/marketing-campaign-audience-response.dto';
import { GetMarketingCampaignAudienceQueryDto } from './dto/get-marketing-campaign-audience-query.dto';
import { PaginatedMarketingCampaignAudienceResponseDto } from './dto/paginated-marketing-campaign-audience-response.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/constants/role.enum';
import { Scope } from 'src/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { MarketingCampaignAudienceStatus } from './constants/marketing-campaign-audience-status.enum';

@ApiTags('Marketing Campaign Audience')
@ApiBearerAuth()
@Controller('marketing-campaign-audience')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MarketingCampaingAudienceController {
  constructor(private readonly marketingCampaingAudienceService: MarketingCampaingAudienceService) {}

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
    summary: 'Create a new Marketing Campaign Audience entry',
    description: 'Creates a new audience entry linking a customer to a marketing campaign. Only portal administrators and merchant administrators can create audience entries.'
  })
  @ApiCreatedResponse({
    description: 'Marketing campaign audience entry created successfully',
    type: OneMarketingCampaignAudienceResponseDto,
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
    description: 'Forbidden - You must be associated with a merchant to create audience entries',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({ 
    description: 'Marketing campaign or customer not found',
    type: ErrorResponse,
  })
  @ApiConflictResponse({ 
    description: 'This customer is already in the audience for this campaign',
    type: ErrorResponse,
  })
  @ApiBody({ 
    type: CreateMarketingCampaignAudienceDto,
    description: 'Marketing campaign audience creation data',
    examples: {
      example1: {
        summary: 'Add customer to campaign',
        value: {
          marketingCampaignId: 1,
          customerId: 1,
          status: 'pending',
        }
      },
    }
  })
  async create(
    @Body() dto: CreateMarketingCampaignAudienceDto,
    @Request() req: any,
  ): Promise<OneMarketingCampaignAudienceResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.marketingCampaingAudienceService.create(dto, authenticatedUserMerchantId);
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
    summary: 'Get all Marketing Campaign Audience entries with pagination and filters',
    description: 'Retrieves a paginated list of marketing campaign audience entries for the authenticated user\'s merchant. Supports filtering by campaign, customer, status, and creation date.'
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
    name: 'marketingCampaignId',
    required: false,
    type: Number,
    description: 'Filter by marketing campaign ID',
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
    name: 'status',
    required: false,
    enum: MarketingCampaignAudienceStatus,
    description: 'Filter by audience status',
    example: MarketingCampaignAudienceStatus.SENT
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
    enum: ['createdAt', 'updatedAt', 'sentAt', 'deliveredAt', 'openedAt', 'clickedAt', 'status'],
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
    description: 'Paginated list of marketing campaign audience entries retrieved successfully',
    type: PaginatedMarketingCampaignAudienceResponseDto,
  })
  @ApiUnauthorizedResponse({ 
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({ 
    description: 'Forbidden - User must be associated with a merchant to view audience entries',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid query parameters',
    type: ErrorResponse,
  })
  async findAll(
    @Query() query: GetMarketingCampaignAudienceQueryDto,
    @Request() req: any,
  ): Promise<PaginatedMarketingCampaignAudienceResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.marketingCampaingAudienceService.findAll(query, authenticatedUserMerchantId);
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
    summary: 'Get a Marketing Campaign Audience entry by ID',
    description: 'Retrieves a specific marketing campaign audience entry by its ID. Users can only access audience entries from their own merchant.'
  })
  @ApiParam({ name: 'id', type: Number, description: 'Marketing campaign audience entry ID' })
  @ApiOkResponse({ 
    description: 'Marketing campaign audience entry found successfully',
    type: OneMarketingCampaignAudienceResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden - You can only view audience entries from your own merchant', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Marketing campaign audience entry not found', type: ErrorResponse })
  @ApiBadRequestResponse({ description: 'Invalid audience entry ID', type: ErrorResponse })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ): Promise<OneMarketingCampaignAudienceResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.marketingCampaingAudienceService.findOne(id, authenticatedUserMerchantId);
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
    summary: 'Update a Marketing Campaign Audience entry by ID',
    description: 'Updates an existing marketing campaign audience entry for the authenticated user\'s merchant. Only portal administrators and merchant administrators can update audience entries. All fields are optional.'
  })
  @ApiParam({ 
    name: 'id', 
    type: Number, 
    description: 'Marketing campaign audience entry ID to update',
    example: 1
  })
  @ApiOkResponse({ 
    description: 'Marketing campaign audience entry updated successfully', 
    type: OneMarketingCampaignAudienceResponseDto,
  })
  @ApiUnauthorizedResponse({ 
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({ 
    description: 'Forbidden - You can only update audience entries from your own merchant',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({ 
    description: 'Marketing campaign audience entry, campaign, or customer not found',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid input data or ID',
    type: ErrorResponse,
  })
  @ApiConflictResponse({ 
    description: 'This customer is already in the audience for this campaign',
    type: ErrorResponse,
  })
  @ApiBody({ 
    type: UpdateMarketingCampaignAudienceDto,
    description: 'Marketing campaign audience update data (all fields optional)',
    examples: {
      example1: {
        summary: 'Update status',
        value: {
          status: 'sent',
        }
      },
      example2: {
        summary: 'Update status and error message',
        value: {
          status: 'failed',
          errorMessage: 'Invalid email address',
        }
      }
    }
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMarketingCampaignAudienceDto,
    @Request() req: any,
  ): Promise<OneMarketingCampaignAudienceResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.marketingCampaingAudienceService.update(id, dto, authenticatedUserMerchantId);
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
    summary: 'Soft delete a Marketing Campaign Audience entry by ID',
    description: 'Performs a soft delete by changing the audience entry status to "deleted". Only merchant administrators can delete audience entries from their own merchant.'
  })
  @ApiParam({ name: 'id', type: Number, description: 'Marketing campaign audience entry ID to delete' })
  @ApiOkResponse({ 
    description: 'Marketing campaign audience entry soft deleted successfully',
    type: OneMarketingCampaignAudienceResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden - You can only delete audience entries from your own merchant', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Marketing campaign audience entry not found', type: ErrorResponse })
  @ApiBadRequestResponse({ description: 'Invalid audience entry ID', type: ErrorResponse })
  @ApiConflictResponse({ description: 'Marketing campaign audience entry is already deleted', type: ErrorResponse })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ): Promise<OneMarketingCampaignAudienceResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.marketingCampaingAudienceService.remove(id, authenticatedUserMerchantId);
  }
}
