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
import { MarketingAutomationsService } from './marketing-automations.service';
import { CreateMarketingAutomationDto } from './dto/create-marketing-automation.dto';
import { UpdateMarketingAutomationDto } from './dto/update-marketing-automation.dto';
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
import { MarketingAutomationResponseDto, OneMarketingAutomationResponseDto, PaginatedMarketingAutomationResponseDto } from './dto/marketing-automation-response.dto';
import { GetMarketingAutomationQueryDto } from './dto/get-marketing-automation-query.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/constants/role.enum';
import { Scope } from 'src/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { MarketingAutomationTrigger } from './constants/marketing-automation-trigger.enum';
import { MarketingAutomationAction } from './constants/marketing-automation-action.enum';

@ApiTags('Marketing Automations')
@ApiBearerAuth()
@Controller('marketing-automations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MarketingAutomationsController {
  constructor(private readonly marketingAutomationsService: MarketingAutomationsService) {}

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
    summary: 'Create a new Marketing Automation',
    description: 'Creates a new marketing automation for the authenticated user\'s merchant. Only portal administrators and merchant administrators can create marketing automations.'
  })
  @ApiCreatedResponse({
    description: 'Marketing automation created successfully',
    type: OneMarketingAutomationResponseDto,
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
    description: 'Forbidden - You must be associated with a merchant to create marketing automations',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({ 
    description: 'Merchant not found',
    type: ErrorResponse,
  })
  @ApiBody({ 
    type: CreateMarketingAutomationDto,
    description: 'Marketing automation creation data',
    examples: {
      example1: {
        summary: 'Create welcome email automation',
        value: {
          name: 'Welcome Email Campaign',
          trigger: MarketingAutomationTrigger.ON_NEW_CUSTOMER,
          action: MarketingAutomationAction.SEND_EMAIL,
          actionPayload: '{"template_id": 1, "subject": "Welcome!"}',
          active: true,
        }
      },
      example2: {
        summary: 'Create birthday coupon automation',
        value: {
          name: 'Birthday Coupon',
          trigger: MarketingAutomationTrigger.BIRTHDAY,
          action: MarketingAutomationAction.ASSIGN_COUPON,
          actionPayload: '{"coupon_id": 1}',
          active: true,
        }
      }
    }
  })
  async create(
    @Body() dto: CreateMarketingAutomationDto,
    @Request() req: any,
  ): Promise<OneMarketingAutomationResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.marketingAutomationsService.create(dto, authenticatedUserMerchantId);
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
    summary: 'Get all Marketing Automations with pagination and filters',
    description: 'Retrieves a paginated list of marketing automations for the authenticated user\'s merchant. Supports filtering by name, trigger, action, active status, and creation date.'
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
    name: 'name',
    required: false,
    type: String,
    description: 'Filter by automation name (partial match)',
    example: 'Welcome'
  })
  @ApiQuery({
    name: 'trigger',
    required: false,
    enum: MarketingAutomationTrigger,
    description: 'Filter by trigger',
    example: MarketingAutomationTrigger.ON_NEW_CUSTOMER
  })
  @ApiQuery({
    name: 'action',
    required: false,
    enum: MarketingAutomationAction,
    description: 'Filter by action',
    example: MarketingAutomationAction.SEND_EMAIL
  })
  @ApiQuery({
    name: 'active',
    required: false,
    type: Boolean,
    description: 'Filter by active status',
    example: true
  })
  @ApiQuery({
    name: 'createdDate',
    required: false,
    type: String,
    description: 'Filter by creation date (YYYY-MM-DD format)',
    example: '2024-01-01'
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['name', 'trigger', 'action', 'createdAt', 'updatedAt'],
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
    description: 'Paginated list of marketing automations retrieved successfully',
    type: PaginatedMarketingAutomationResponseDto,
  })
  @ApiUnauthorizedResponse({ 
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({ 
    description: 'Forbidden - User must be associated with a merchant to view marketing automations',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid query parameters',
    type: ErrorResponse,
  })
  async findAll(
    @Query() query: GetMarketingAutomationQueryDto,
    @Request() req: any,
  ): Promise<PaginatedMarketingAutomationResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.marketingAutomationsService.findAll(query, authenticatedUserMerchantId);
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
    summary: 'Get a Marketing Automation by ID',
    description: 'Retrieves a specific marketing automation by its ID. Users can only access marketing automations from their own merchant.'
  })
  @ApiParam({ name: 'id', type: Number, description: 'Marketing automation ID' })
  @ApiOkResponse({ 
    description: 'Marketing automation found successfully',
    type: OneMarketingAutomationResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden - You can only view marketing automations from your own merchant', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Marketing automation not found', type: ErrorResponse })
  @ApiBadRequestResponse({ description: 'Invalid marketing automation ID', type: ErrorResponse })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ): Promise<OneMarketingAutomationResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.marketingAutomationsService.findOne(id, authenticatedUserMerchantId);
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
    summary: 'Update a Marketing Automation by ID',
    description: 'Updates an existing marketing automation for the authenticated user\'s merchant. Only portal administrators and merchant administrators can update marketing automations. All fields are optional.'
  })
  @ApiParam({ 
    name: 'id', 
    type: Number, 
    description: 'Marketing automation ID to update',
    example: 1
  })
  @ApiOkResponse({ 
    description: 'Marketing automation updated successfully', 
    type: OneMarketingAutomationResponseDto,
  })
  @ApiUnauthorizedResponse({ 
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({ 
    description: 'Forbidden - You can only update marketing automations from your own merchant',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({ 
    description: 'Marketing automation not found',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid input data or ID',
    type: ErrorResponse,
  })
  @ApiBody({ 
    type: UpdateMarketingAutomationDto,
    description: 'Marketing automation update data (all fields optional)',
    examples: {
      example1: {
        summary: 'Update name and active status',
        value: {
          name: 'Updated Welcome Email',
          active: false,
        }
      },
      example2: {
        summary: 'Update action payload',
        value: {
          actionPayload: '{"template_id": 2, "subject": "Updated Welcome!"}',
        }
      }
    }
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMarketingAutomationDto,
    @Request() req: any,
  ): Promise<OneMarketingAutomationResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.marketingAutomationsService.update(id, dto, authenticatedUserMerchantId);
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
    summary: 'Soft delete a Marketing Automation by ID',
    description: 'Performs a soft delete by changing the marketing automation status to "deleted". Only merchant administrators can delete marketing automations from their own merchant.'
  })
  @ApiParam({ name: 'id', type: Number, description: 'Marketing automation ID to delete' })
  @ApiOkResponse({ 
    description: 'Marketing automation soft deleted successfully',
    type: OneMarketingAutomationResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden - You can only delete marketing automations from your own merchant', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Marketing automation not found', type: ErrorResponse })
  @ApiBadRequestResponse({ description: 'Invalid marketing automation ID', type: ErrorResponse })
  @ApiConflictResponse({ description: 'Marketing automation is already deleted', type: ErrorResponse })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ): Promise<OneMarketingAutomationResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.marketingAutomationsService.remove(id, authenticatedUserMerchantId);
  }
}
