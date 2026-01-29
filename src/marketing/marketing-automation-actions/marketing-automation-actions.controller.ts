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
import { MarketingAutomationActionsService } from './marketing-automation-actions.service';
import { CreateMarketingAutomationActionDto } from './dto/create-marketing-automation-action.dto';
import { UpdateMarketingAutomationActionDto } from './dto/update-marketing-automation-action.dto';
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
import { MarketingAutomationActionResponseDto, OneMarketingAutomationActionResponseDto, PaginatedMarketingAutomationActionResponseDto } from './dto/marketing-automation-action-response.dto';
import { GetMarketingAutomationActionQueryDto } from './dto/get-marketing-automation-action-query.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/constants/role.enum';
import { Scope } from 'src/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { MarketingAutomationActionType } from './constants/marketing-automation-action-type.enum';

@ApiTags('Marketing Automation Actions')
@ApiBearerAuth()
@Controller('marketing-automation-actions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MarketingAutomationActionsController {
  constructor(private readonly marketingAutomationActionsService: MarketingAutomationActionsService) {}

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
    summary: 'Create a new Marketing Automation Action',
    description: 'Creates a new marketing automation action for the authenticated user\'s merchant. Only portal administrators and merchant administrators can create marketing automation actions.'
  })
  @ApiCreatedResponse({
    description: 'Marketing automation action created successfully',
    type: OneMarketingAutomationActionResponseDto,
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
    description: 'Forbidden - You must be associated with a merchant to create marketing automation actions',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({ 
    description: 'Marketing automation not found',
    type: ErrorResponse,
  })
  @ApiBody({ 
    type: CreateMarketingAutomationActionDto,
    description: 'Marketing automation action creation data',
    examples: {
      example1: {
        summary: 'Create send email action',
        value: {
          automationId: 1,
          sequence: 1,
          actionType: MarketingAutomationActionType.SEND_EMAIL,
          payload: '{"template_id": 1, "subject": "Welcome!"}',
          delaySeconds: 0,
        }
      },
      example2: {
        summary: 'Create assign coupon action with delay',
        value: {
          automationId: 1,
          sequence: 2,
          actionType: MarketingAutomationActionType.ASSIGN_COUPON,
          targetId: 1,
          payload: '{"coupon_code": "WELCOME10"}',
          delaySeconds: 3600,
        }
      },
      example3: {
        summary: 'Create add to segment action',
        value: {
          automationId: 1,
          sequence: 3,
          actionType: MarketingAutomationActionType.ADD_TO_SEGMENT,
          targetId: 5,
        }
      }
    }
  })
  async create(
    @Body() dto: CreateMarketingAutomationActionDto,
    @Request() req: any,
  ): Promise<OneMarketingAutomationActionResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.marketingAutomationActionsService.create(dto, authenticatedUserMerchantId);
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
    summary: 'Get all Marketing Automation Actions with pagination and filters',
    description: 'Retrieves a paginated list of marketing automation actions for the authenticated user\'s merchant. Supports filtering by automation ID, action type, target ID, and creation date.'
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
    name: 'automationId',
    required: false,
    type: Number,
    description: 'Filter by automation ID',
    example: 1
  })
  @ApiQuery({
    name: 'actionType',
    required: false,
    enum: MarketingAutomationActionType,
    description: 'Filter by action type',
    example: MarketingAutomationActionType.SEND_EMAIL
  })
  @ApiQuery({
    name: 'targetId',
    required: false,
    type: Number,
    description: 'Filter by target ID',
    example: 1
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
    enum: ['sequence', 'actionType', 'createdAt'],
    description: 'Field to sort by',
    example: 'sequence'
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Sort order',
    example: 'ASC'
  })
  @ApiOkResponse({ 
    description: 'Paginated list of marketing automation actions retrieved successfully',
    type: PaginatedMarketingAutomationActionResponseDto,
  })
  @ApiUnauthorizedResponse({ 
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({ 
    description: 'Forbidden - User must be associated with a merchant to view marketing automation actions',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid query parameters',
    type: ErrorResponse,
  })
  async findAll(
    @Query() query: GetMarketingAutomationActionQueryDto,
    @Request() req: any,
  ): Promise<PaginatedMarketingAutomationActionResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.marketingAutomationActionsService.findAll(query, authenticatedUserMerchantId);
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
    summary: 'Get a Marketing Automation Action by ID',
    description: 'Retrieves a specific marketing automation action by its ID. Users can only access marketing automation actions from their own merchant.'
  })
  @ApiParam({ name: 'id', type: Number, description: 'Marketing automation action ID' })
  @ApiOkResponse({ 
    description: 'Marketing automation action found successfully',
    type: OneMarketingAutomationActionResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden - You can only view marketing automation actions from your own merchant', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Marketing automation action not found', type: ErrorResponse })
  @ApiBadRequestResponse({ description: 'Invalid marketing automation action ID', type: ErrorResponse })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ): Promise<OneMarketingAutomationActionResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.marketingAutomationActionsService.findOne(id, authenticatedUserMerchantId);
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
    summary: 'Update a Marketing Automation Action by ID',
    description: 'Updates an existing marketing automation action for the authenticated user\'s merchant. Only portal administrators and merchant administrators can update marketing automation actions. All fields are optional.'
  })
  @ApiParam({ 
    name: 'id', 
    type: Number, 
    description: 'Marketing automation action ID to update',
    example: 1
  })
  @ApiOkResponse({ 
    description: 'Marketing automation action updated successfully', 
    type: OneMarketingAutomationActionResponseDto,
  })
  @ApiUnauthorizedResponse({ 
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({ 
    description: 'Forbidden - You can only update marketing automation actions from your own merchant',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({ 
    description: 'Marketing automation action not found',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid input data or ID',
    type: ErrorResponse,
  })
  @ApiBody({ 
    type: UpdateMarketingAutomationActionDto,
    description: 'Marketing automation action update data (all fields optional)',
    examples: {
      example1: {
        summary: 'Update sequence and delay',
        value: {
          sequence: 2,
          delaySeconds: 7200,
        }
      },
      example2: {
        summary: 'Update payload',
        value: {
          payload: '{"template_id": 2, "subject": "Updated Welcome!"}',
        }
      }
    }
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMarketingAutomationActionDto,
    @Request() req: any,
  ): Promise<OneMarketingAutomationActionResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.marketingAutomationActionsService.update(id, dto, authenticatedUserMerchantId);
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
    summary: 'Soft delete a Marketing Automation Action by ID',
    description: 'Performs a soft delete by changing the marketing automation action status to "deleted". Only merchant administrators can delete marketing automation actions from their own merchant.'
  })
  @ApiParam({ name: 'id', type: Number, description: 'Marketing automation action ID to delete' })
  @ApiOkResponse({ 
    description: 'Marketing automation action soft deleted successfully',
    type: OneMarketingAutomationActionResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden - You can only delete marketing automation actions from your own merchant', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Marketing automation action not found', type: ErrorResponse })
  @ApiBadRequestResponse({ description: 'Invalid marketing automation action ID', type: ErrorResponse })
  @ApiConflictResponse({ description: 'Marketing automation action is already deleted', type: ErrorResponse })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ): Promise<OneMarketingAutomationActionResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.marketingAutomationActionsService.remove(id, authenticatedUserMerchantId);
  }
}
