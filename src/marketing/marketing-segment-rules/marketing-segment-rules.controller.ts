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
import { MarketingSegmentRulesService } from './marketing-segment-rules.service';
import { CreateMarketingSegmentRuleDto } from './dto/create-marketing-segment-rule.dto';
import { UpdateMarketingSegmentRuleDto } from './dto/update-marketing-segment-rule.dto';
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
import { MarketingSegmentRuleResponseDto, OneMarketingSegmentRuleResponseDto, PaginatedMarketingSegmentRuleResponseDto } from './dto/marketing-segment-rule-response.dto';
import { GetMarketingSegmentRuleQueryDto } from './dto/get-marketing-segment-rule-query.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/constants/role.enum';
import { Scope } from 'src/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { MarketingSegmentRuleOperator } from './constants/marketing-segment-rule-operator.enum';

@ApiTags('Marketing Segment Rules')
@ApiBearerAuth()
@Controller('marketing-segment-rules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MarketingSegmentRulesController {
  constructor(private readonly marketingSegmentRulesService: MarketingSegmentRulesService) {}

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
    summary: 'Create a new Marketing Segment Rule',
    description: 'Creates a new marketing segment rule for the authenticated user\'s merchant. Only portal administrators and merchant administrators can create marketing segment rules.'
  })
  @ApiCreatedResponse({
    description: 'Marketing segment rule created successfully',
    type: OneMarketingSegmentRuleResponseDto,
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
    description: 'Forbidden - You must be associated with a merchant to create marketing segment rules',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({ 
    description: 'Marketing segment not found',
    type: ErrorResponse,
  })
  @ApiBody({ 
    type: CreateMarketingSegmentRuleDto,
    description: 'Marketing segment rule creation data',
    examples: {
      example1: {
        summary: 'Create rule for total spent',
        value: {
          segmentId: 1,
          field: 'total_spent',
          operator: MarketingSegmentRuleOperator.GREATER_THAN,
          value: '1000',
        }
      },
      example2: {
        summary: 'Create rule for last order days',
        value: {
          segmentId: 1,
          field: 'last_order_days',
          operator: MarketingSegmentRuleOperator.LESS_THAN_OR_EQUAL,
          value: '30',
        }
      },
      example3: {
        summary: 'Create rule for city',
        value: {
          segmentId: 1,
          field: 'city',
          operator: MarketingSegmentRuleOperator.EQUALS,
          value: 'Madrid',
        }
      }
    }
  })
  async create(
    @Body() dto: CreateMarketingSegmentRuleDto,
    @Request() req: any,
  ): Promise<OneMarketingSegmentRuleResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.marketingSegmentRulesService.create(dto, authenticatedUserMerchantId);
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
    summary: 'Get all Marketing Segment Rules with pagination and filters',
    description: 'Retrieves a paginated list of marketing segment rules for the authenticated user\'s merchant. Supports filtering by segment ID, field, operator, and creation date.'
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
    name: 'segmentId',
    required: false,
    type: Number,
    description: 'Filter by segment ID',
    example: 1
  })
  @ApiQuery({
    name: 'field',
    required: false,
    type: String,
    description: 'Filter by field name (partial match)',
    example: 'total_spent'
  })
  @ApiQuery({
    name: 'operator',
    required: false,
    enum: MarketingSegmentRuleOperator,
    description: 'Filter by operator',
    example: MarketingSegmentRuleOperator.GREATER_THAN
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
    enum: ['field', 'operator', 'createdAt', 'updatedAt'],
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
    description: 'Paginated list of marketing segment rules retrieved successfully',
    type: PaginatedMarketingSegmentRuleResponseDto,
  })
  @ApiUnauthorizedResponse({ 
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({ 
    description: 'Forbidden - User must be associated with a merchant to view marketing segment rules',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid query parameters',
    type: ErrorResponse,
  })
  async findAll(
    @Query() query: GetMarketingSegmentRuleQueryDto,
    @Request() req: any,
  ): Promise<PaginatedMarketingSegmentRuleResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.marketingSegmentRulesService.findAll(query, authenticatedUserMerchantId);
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
    summary: 'Get a Marketing Segment Rule by ID',
    description: 'Retrieves a specific marketing segment rule by its ID. Users can only access marketing segment rules from their own merchant.'
  })
  @ApiParam({ name: 'id', type: Number, description: 'Marketing segment rule ID' })
  @ApiOkResponse({ 
    description: 'Marketing segment rule found successfully',
    type: OneMarketingSegmentRuleResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden - You can only view marketing segment rules from your own merchant', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Marketing segment rule not found', type: ErrorResponse })
  @ApiBadRequestResponse({ description: 'Invalid marketing segment rule ID', type: ErrorResponse })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ): Promise<OneMarketingSegmentRuleResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.marketingSegmentRulesService.findOne(id, authenticatedUserMerchantId);
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
    summary: 'Update a Marketing Segment Rule by ID',
    description: 'Updates an existing marketing segment rule for the authenticated user\'s merchant. Only portal administrators and merchant administrators can update marketing segment rules. All fields are optional.'
  })
  @ApiParam({ 
    name: 'id', 
    type: Number, 
    description: 'Marketing segment rule ID to update',
    example: 1
  })
  @ApiOkResponse({ 
    description: 'Marketing segment rule updated successfully', 
    type: OneMarketingSegmentRuleResponseDto,
  })
  @ApiUnauthorizedResponse({ 
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({ 
    description: 'Forbidden - You can only update marketing segment rules from your own merchant',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({ 
    description: 'Marketing segment rule not found',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid input data or ID',
    type: ErrorResponse,
  })
  @ApiBody({ 
    type: UpdateMarketingSegmentRuleDto,
    description: 'Marketing segment rule update data (all fields optional)',
    examples: {
      example1: {
        summary: 'Update field and value',
        value: {
          field: 'total_spent',
          value: '2000',
        }
      },
      example2: {
        summary: 'Update operator',
        value: {
          operator: MarketingSegmentRuleOperator.LESS_THAN,
        }
      }
    }
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMarketingSegmentRuleDto,
    @Request() req: any,
  ): Promise<OneMarketingSegmentRuleResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.marketingSegmentRulesService.update(id, dto, authenticatedUserMerchantId);
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
    summary: 'Soft delete a Marketing Segment Rule by ID',
    description: 'Performs a soft delete by changing the marketing segment rule status to "deleted". Only merchant administrators can delete marketing segment rules from their own merchant.'
  })
  @ApiParam({ name: 'id', type: Number, description: 'Marketing segment rule ID to delete' })
  @ApiOkResponse({ 
    description: 'Marketing segment rule soft deleted successfully',
    type: OneMarketingSegmentRuleResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden - You can only delete marketing segment rules from your own merchant', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Marketing segment rule not found', type: ErrorResponse })
  @ApiBadRequestResponse({ description: 'Invalid marketing segment rule ID', type: ErrorResponse })
  @ApiConflictResponse({ description: 'Marketing segment rule is already deleted', type: ErrorResponse })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ): Promise<OneMarketingSegmentRuleResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.marketingSegmentRulesService.remove(id, authenticatedUserMerchantId);
  }
}
