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
import { KitchenEventLogService } from './kitchen-event-log.service';
import { CreateKitchenEventLogDto } from './dto/create-kitchen-event-log.dto';
import { UpdateKitchenEventLogDto } from './dto/update-kitchen-event-log.dto';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiBody,
  ApiForbiddenResponse,
  ApiQuery,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { KitchenEventLogResponseDto, OneKitchenEventLogResponseDto } from './dto/kitchen-event-log-response.dto';
import { GetKitchenEventLogQueryDto } from './dto/get-kitchen-event-log-query.dto';
import { PaginatedKitchenEventLogResponseDto } from './dto/kitchen-event-log-response.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/constants/role.enum';
import { Scope } from 'src/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { KitchenEventLogEventType } from './constants/kitchen-event-log-event-type.enum';
import { KitchenEventLogStatus } from './constants/kitchen-event-log-status.enum';

@ApiTags('Kitchen Event Logs')
@ApiBearerAuth()
@Controller('kitchen-event-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class KitchenEventLogController {
  constructor(private readonly kitchenEventLogService: KitchenEventLogService) {}

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
    summary: 'Create a new Kitchen Event Log',
    description: 'Creates a new kitchen event log. The associated kitchen order, kitchen order item, or station must belong to the authenticated user\'s merchant. The event_time field is optional and will be automatically set to the current date and time if not provided. Only portal administrators and merchant administrators can create kitchen event logs.',
  })
  @ApiCreatedResponse({
    description: 'Kitchen event log created successfully',
    type: OneKitchenEventLogResponseDto,
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
    description: 'Forbidden - You must be associated with a merchant to create kitchen event logs',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Kitchen order, kitchen order item, station, or user not found',
    type: ErrorResponse,
  })
  @ApiBody({
    type: CreateKitchenEventLogDto,
    description: 'Kitchen event log creation data. Note: eventTime is optional and will be automatically set to the current date and time if not provided.',
    examples: {
      example1: {
        summary: 'Create event log',
        value: {
          kitchenOrderId: 1,
          kitchenOrderItemId: 1,
          stationId: 1,
          userId: 1,
          eventType: 'inicio',
          message: 'Order started in kitchen',
        },
      },
    },
  })
  async create(@Body() createKitchenEventLogDto: CreateKitchenEventLogDto, @Request() req: any) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.kitchenEventLogService.create(createKitchenEventLogDto, authenticatedUserMerchantId);
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
    summary: 'Get all Kitchen Event Logs',
    description: 'Retrieves a paginated list of kitchen event logs. Only returns logs that belong to kitchen orders of the authenticated user\'s merchant. Only portal administrators and merchant administrators can access kitchen event logs.',
  })
  @ApiOkResponse({
    description: 'Kitchen event logs retrieved successfully',
    type: PaginatedKitchenEventLogResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - You must be associated with a merchant to access kitchen event logs',
    type: ErrorResponse,
  })
  @ApiQuery({
    name: 'kitchenOrderId',
    required: false,
    type: Number,
    description: 'Filter by kitchen order ID',
  })
  @ApiQuery({
    name: 'kitchenOrderItemId',
    required: false,
    type: Number,
    description: 'Filter by kitchen order item ID',
  })
  @ApiQuery({
    name: 'stationId',
    required: false,
    type: Number,
    description: 'Filter by station ID',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    type: Number,
    description: 'Filter by user ID',
  })
  @ApiQuery({
    name: 'eventType',
    required: false,
    enum: KitchenEventLogEventType,
    description: 'Filter by event type',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: KitchenEventLogStatus,
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'eventDate',
    required: false,
    type: String,
    description: 'Filter by event date (YYYY-MM-DD format)',
  })
  @ApiQuery({
    name: 'createdDate',
    required: false,
    type: String,
    description: 'Filter by creation date (YYYY-MM-DD format)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination (minimum 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (minimum 1, maximum 100)',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['id', 'kitchenOrderId', 'kitchenOrderItemId', 'stationId', 'userId', 'eventType', 'eventTime', 'createdAt', 'updatedAt'],
    description: 'Field to sort by',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Sort order (ASC or DESC)',
  })
  async findAll(@Query() query: GetKitchenEventLogQueryDto, @Request() req: any) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.kitchenEventLogService.findAll(query, authenticatedUserMerchantId);
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
    summary: 'Get a single Kitchen Event Log by ID',
    description: 'Retrieves a single kitchen event log by its ID. The log must belong to a kitchen order of the authenticated user\'s merchant. Only portal administrators and merchant administrators can access kitchen event logs.',
  })
  @ApiOkResponse({
    description: 'Kitchen event log retrieved successfully',
    type: OneKitchenEventLogResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - You must be associated with a merchant to access kitchen event logs',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Kitchen event log not found',
    type: ErrorResponse,
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Kitchen event log ID',
    example: 1,
  })
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.kitchenEventLogService.findOne(id, authenticatedUserMerchantId);
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
    summary: 'Update a Kitchen Event Log',
    description: 'Updates an existing kitchen event log. The log must belong to a kitchen order of the authenticated user\'s merchant. Only portal administrators and merchant administrators can update kitchen event logs.',
  })
  @ApiOkResponse({
    description: 'Kitchen event log updated successfully',
    type: OneKitchenEventLogResponseDto,
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
    description: 'Forbidden - You must be associated with a merchant to update kitchen event logs',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Kitchen event log, kitchen order, kitchen order item, station, or user not found',
    type: ErrorResponse,
  })
  @ApiConflictResponse({
    description: 'Conflict - Cannot update a deleted kitchen event log',
    type: ErrorResponse,
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Kitchen event log ID',
    example: 1,
  })
  @ApiBody({
    type: UpdateKitchenEventLogDto,
    description: 'Kitchen event log update data',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateKitchenEventLogDto: UpdateKitchenEventLogDto,
    @Request() req: any,
  ) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.kitchenEventLogService.update(id, updateKitchenEventLogDto, authenticatedUserMerchantId);
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
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a Kitchen Event Log',
    description: 'Performs a logical deletion of a kitchen event log. The log must belong to a kitchen order of the authenticated user\'s merchant. Only portal administrators and merchant administrators can delete kitchen event logs.',
  })
  @ApiOkResponse({
    description: 'Kitchen event log deleted successfully',
    type: OneKitchenEventLogResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - You must be associated with a merchant to delete kitchen event logs',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Kitchen event log not found',
    type: ErrorResponse,
  })
  @ApiConflictResponse({
    description: 'Conflict - Kitchen event log is already deleted',
    type: ErrorResponse,
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Kitchen event log ID',
    example: 1,
  })
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.kitchenEventLogService.remove(id, authenticatedUserMerchantId);
  }
}
