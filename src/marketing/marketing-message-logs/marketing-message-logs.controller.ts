import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  ParseIntPipe,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { MarketingMessageLogsService } from './marketing-message-logs.service';
import { CreateMarketingMessageLogDto } from './dto/create-marketing-message-log.dto';
import { UpdateMarketingMessageLogDto } from './dto/update-marketing-message-log.dto';
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
import {
  OneMarketingMessageLogResponseDto,
  PaginatedMarketingMessageLogResponseDto,
} from './dto/marketing-message-log-response.dto';
import { GetMarketingMessageLogQueryDto } from './dto/get-marketing-message-log-query.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/constants/role.enum';
import { Scope } from 'src/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { MarketingMessageLogChannel } from './constants/marketing-message-log-channel.enum';
import { MarketingMessageLogStatus } from './constants/marketing-message-log-status.enum';

@ApiTags('Marketing Message Logs')
@ApiBearerAuth()
@Controller('marketing-message-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MarketingMessageLogsController {
  constructor(private readonly marketingMessageLogsService: MarketingMessageLogsService) {}

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
    summary: 'Create a new Marketing Message Log',
    description:
      "Creates a new marketing message log for the authenticated user's merchant. At least one of campaign or automation can be set; customer is required.",
  })
  @ApiCreatedResponse({
    description: 'Marketing message log created successfully',
    type: OneMarketingMessageLogResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data or validation errors', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing authentication token', type: ErrorResponse })
  @ApiForbiddenResponse({
    description: 'Forbidden - You must be associated with a merchant to create marketing message logs',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Campaign, automation, or customer not found',
    type: ErrorResponse,
  })
  @ApiBody({
    type: CreateMarketingMessageLogDto,
    description: 'Marketing message log creation data',
    examples: {
      example1: {
        summary: 'Create log (campaign)',
        value: {
          campaignId: 1,
          customerId: 1,
          channel: MarketingMessageLogChannel.EMAIL,
          status: MarketingMessageLogStatus.SENT,
        },
      },
      example2: {
        summary: 'Create log (automation)',
        value: {
          automationId: 1,
          customerId: 1,
          channel: MarketingMessageLogChannel.SMS,
          status: MarketingMessageLogStatus.DELIVERED,
          sentAt: '2024-01-15T10:00:00Z',
        },
      },
    },
  })
  async create(@Body() dto: CreateMarketingMessageLogDto, @Request() req: any) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.marketingMessageLogsService.create(dto, authenticatedUserMerchantId);
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
    summary: 'Get all Marketing Message Logs with pagination and filters',
    description:
      "Retrieves a paginated list of marketing message logs for the authenticated user's merchant.",
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (minimum 1)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (1-100)', example: 10 })
  @ApiQuery({ name: 'campaignId', required: false, type: Number, description: 'Filter by campaign ID' })
  @ApiQuery({ name: 'automationId', required: false, type: Number, description: 'Filter by automation ID' })
  @ApiQuery({ name: 'customerId', required: false, type: Number, description: 'Filter by customer ID' })
  @ApiQuery({ name: 'channel', required: false, enum: MarketingMessageLogChannel, description: 'Filter by channel' })
  @ApiQuery({ name: 'status', required: false, enum: MarketingMessageLogStatus, description: 'Filter by status' })
  @ApiQuery({ name: 'sentDate', required: false, type: String, description: 'Filter by sent date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'createdDate', required: false, type: String, description: 'Filter by creation date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['sentAt', 'status', 'createdAt', 'updatedAt'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiOkResponse({
    description: 'Paginated list of marketing message logs retrieved successfully',
    type: PaginatedMarketingMessageLogResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden - User must be associated with a merchant', type: ErrorResponse })
  @ApiBadRequestResponse({ description: 'Invalid query parameters', type: ErrorResponse })
  async findAll(@Query() query: GetMarketingMessageLogQueryDto, @Request() req: any) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.marketingMessageLogsService.findAll(query, authenticatedUserMerchantId);
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
    summary: 'Get a Marketing Message Log by ID',
    description: 'Retrieves a specific marketing message log by its ID. Users can only access logs from their own merchant.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Marketing message log ID' })
  @ApiOkResponse({
    description: 'Marketing message log found successfully',
    type: OneMarketingMessageLogResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Marketing message log not found', type: ErrorResponse })
  @ApiBadRequestResponse({ description: 'Invalid ID', type: ErrorResponse })
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.marketingMessageLogsService.findOne(id, authenticatedUserMerchantId);
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
    summary: 'Update a Marketing Message Log by ID',
    description: 'Updates an existing marketing message log. All fields are optional.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Marketing message log ID to update' })
  @ApiOkResponse({
    description: 'Marketing message log updated successfully',
    type: OneMarketingMessageLogResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Marketing message log not found', type: ErrorResponse })
  @ApiBadRequestResponse({ description: 'Invalid input or ID', type: ErrorResponse })
  @ApiBody({
    type: UpdateMarketingMessageLogDto,
    description: 'Marketing message log update data (all fields optional)',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMarketingMessageLogDto,
    @Request() req: any,
  ) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.marketingMessageLogsService.update(id, dto, authenticatedUserMerchantId);
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
    summary: 'Soft delete a Marketing Message Log by ID',
    description: 'Performs a soft delete by setting the record status to deleted.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Marketing message log ID to delete' })
  @ApiOkResponse({
    description: 'Marketing message log soft deleted successfully',
    type: OneMarketingMessageLogResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Marketing message log not found', type: ErrorResponse })
  @ApiBadRequestResponse({ description: 'Invalid ID', type: ErrorResponse })
  @ApiConflictResponse({ description: 'Marketing message log is already deleted', type: ErrorResponse })
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.marketingMessageLogsService.remove(id, authenticatedUserMerchantId);
  }
}
