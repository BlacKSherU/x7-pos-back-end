//src/commerce/delivery-system/delivery-assignment/delivery-assignment.controller.ts
import {
  Controller,
  Post,
  UseGuards,
  Body,
  Get,
  Query,
  Param,
  ParseIntPipe,
  Patch,
  Delete,
  HttpCode,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiParam,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiServiceUnavailableResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { FeatureAccessGuard } from 'src/auth/guards/feature-access.guard';
import { RequireFeature } from 'src/auth/decorators/require-feature.decorator';
import { SUBSCRIPTION_FEATURE_IDS } from 'src/common/subscription/subscription-feature-ids';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { DeliveryAssignmentService } from './delivery-assignment.service';
import { CreateDeliveryAssignmentDto } from './dto/create-delivery-assignment.dto';
import {
  DeliveryAssignmentResponseDto,
  OneDeliveryAssignmentResponseDto,
} from './dto/delivery-assignment-response.dto';
import { PaginatedDeliveryAssignmentResponseDto } from './dto/paginated-delivery-assignment-response.dto';
import { QueryDeliveryAssignmentDto } from './dto/query-delivery-assignment.dto';
import { UpdateDeliveryAssignmentDto } from './dto/update-delivery-assignment.dto';
import {
  ExternalDispatchDto,
  ExternalQuoteDto,
} from './dto/external-delivery.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { DELIVERY_DELAY_THRESHOLD_MINUTES } from './constants/delivery-assignment.constants';

@ApiTags('Commerce - Delivery System - Delivery Assignment')
@ApiBearerAuth()
@Controller('delivery-assignment')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.DELIVERY_ASSIGNMENTS)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
export class DeliveryAssignmentController {
  constructor(
    private readonly deliveryAssignmentService: DeliveryAssignmentService,
  ) {}
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Create a delivery assignment',
    description:
      'Creates an assignment for a delivery order of the merchant. IN_HOUSE with an active driver starts as ASSIGNED (driver → on_delivery); without a driver, or for DSP types, it starts as PENDING. delivery_status and timestamps are set by the server. 409 if the order already has an open assignment or the driver is already on a delivery.',
  })
  @ApiBody({
    type: CreateDeliveryAssignmentDto,
    description: 'Details of the delivery assignment to be created.',
  })
  @ApiCreatedResponse({
    type: DeliveryAssignmentResponseDto,
    schema: {
      example: {
        id: 1,
        order: { id: 1 },
        deliveryDriver: { id: 1, name: 'Mario Lopez', status: 'on_delivery' },
        assignment_type: 'in_house',
        delivery_status: 'assigned',
        assigned_at: '2024-06-01T12:00:00Z',
        picked_up_at: null,
        delivered_at: null,
        external_delivery_id: null,
        external_tracking_url: null,
        external_dsp_fee: null,
        status: 'active',
      },
    },
  })
  @ApiConflictResponse({
    description:
      'Order already has an open assignment, or the driver is already on a delivery',
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
    schema: {
      example: {
        statusCode: 400,
        message:
          "Delivery driver #2 is 'off_duty'; only active drivers can be assigned",
        error: 'Bad Request',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Authentication required',
    schema: {
      example: {
        statusCode: 401,
        message: 'Authentication required',
        error: 'Unauthorized',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. Insufficient role.',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    schema: {
      example: {
        statusCode: 500,
        message: 'Internal server error',
        error: 'InternalServerError',
      },
    },
  })
  async create(
    @Body() dto: CreateDeliveryAssignmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OneDeliveryAssignmentResponseDto> {
    return this.deliveryAssignmentService.create(dto, user.merchant?.id);
  }

  @Post('external-quote')
  @HttpCode(200)
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
  @ApiOperation({
    summary: 'Quote a third-party (DSP) delivery',
    description:
      'Loads the delivery order and its zone and asks the DSP provider for a quote. The real DoorDash Drive / Uber Direct integrations are NOT implemented yet: until a provider is configured this returns 503 and never a fake quote.',
  })
  @ApiBody({ type: ExternalQuoteDto })
  @ApiServiceUnavailableResponse({
    description: 'Provider not configured',
    schema: {
      example: {
        statusCode: 503,
        message:
          "Delivery provider 'doordash_drive' is not configured. No quote or runner can be requested; record the external delivery manually instead.",
        error: 'Service Unavailable',
      },
    },
  })
  async externalQuote(
    @Body() dto: ExternalQuoteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveryAssignmentService.externalQuote(dto, user.merchant?.id);
  }

  @Post('external-dispatch')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
  @ApiOperation({
    summary: 'Accept a DSP quote and dispatch the delivery',
    description:
      'Requests a runner from the DSP and creates the assignment with no in-house driver and the external_* fields returned by the provider (starts as PENDING until the provider reports dasher_assigned). 503 while the provider is not configured.',
  })
  @ApiBody({ type: ExternalDispatchDto })
  @ApiCreatedResponse({ type: OneDeliveryAssignmentResponseDto })
  @ApiConflictResponse({ description: 'Order already has an open assignment' })
  @ApiServiceUnavailableResponse({ description: 'Provider not configured' })
  async externalDispatch(
    @Body() dto: ExternalDispatchDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OneDeliveryAssignmentResponseDto> {
    return this.deliveryAssignmentService.externalDispatch(
      dto,
      user.merchant?.id,
    );
  }

  @Get()
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
  @ApiOperation({
    summary: 'Get a list of Delivery Assignments',
    description:
      'Endpoint to retrieve a paginated list of Delivery Assignments.',
  })
  @ApiOkResponse({
    description: 'List of Delivery Assignments retrieved successfully.',
    type: PaginatedDeliveryAssignmentResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Authentication required',
    schema: {
      example: {
        statusCode: 401,
        message: 'Authentication required',
        error: 'Unauthorized',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. Insufficient role.',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    schema: {
      example: {
        statusCode: 500,
        message: 'Internal server error',
        error: 'InternalServerError',
      },
    },
  })
  async findAll(
    @Query() query: QueryDeliveryAssignmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedDeliveryAssignmentResponseDto> {
    return this.deliveryAssignmentService.findAll(query, user.merchant?.id);
  }

  // Declarado antes de `:id` para que "summary" no se interprete como un id.
  @Get('summary')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
  @ApiOperation({
    summary: 'Dispatch KPI summary',
    description: `pending_dispatch: delivery orders with kitchen_status=ready and no open assignment. pending_assignments: assignments still PENDING. in_transit: PICKED_UP + IN_TRANSIT. avg_completion_minutes: assigned_at→delivered_at over deliveries of the last 24 h (null when none). delayed: ASSIGNED/PICKED_UP/IN_TRANSIT assigned more than ${DELIVERY_DELAY_THRESHOLD_MINUTES} minutes ago. in_house_share_pct / dsp_share_pct: split of open assignments (null when none). dsp_fee_today: sum of external_dsp_fee since server-local midnight.`,
  })
  @ApiOkResponse({
    description: 'Dispatch KPIs.',
    schema: {
      example: {
        statusCode: 200,
        message: 'Delivery assignment summary retrieved successfully',
        data: {
          pending_dispatch: 3,
          pending_assignments: 1,
          in_transit: 4,
          avg_completion_minutes: 27.5,
          delayed: 1,
          delay_threshold_minutes: 45,
          live_assignments: 8,
          in_house_share_pct: 75,
          dsp_share_pct: 25,
          dsp_fee_today: 22.5,
        },
      },
    },
  })
  async summary(@CurrentUser() user: AuthenticatedUser) {
    return this.deliveryAssignmentService.summary(user.merchant?.id);
  }

  @Get(':id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
  @ApiOperation({
    summary: 'Get a Delivery Assignment by ID',
    description: 'Endpoint to retrieve a single Delivery Assignment by its ID.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the Delivery Assignment to retrieve',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Delivery Assignment retrieved successfully.',
    schema: {
      example: {
        id: 1,
        order: 1,
        deliveryDriver: 1,
        delivery_status: 'assigned',
        assigned_at: '2024-06-01T12:00:00Z',
        picked_up_at: '2024-06-01T12:15:00Z',
        delivered_at: '2024-06-01T12:30:00Z',
        status: 'active',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid ID parameter',
    schema: {
      example: {
        statusCode: 400,
        message: 'ID must be a number',
        error: 'Bad Request',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Authentication required',
    schema: {
      example: {
        statusCode: 401,
        message: 'Authentication required',
        error: 'Unauthorized',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. Insufficient role.',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Delivery Assignment not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Delivery Assignment with ID 1 not found',
        error: 'Not Found',
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    schema: {
      example: {
        statusCode: 500,
        message: 'Internal server error',
        error: 'InternalServerError',
      },
    },
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OneDeliveryAssignmentResponseDto> {
    return this.deliveryAssignmentService.findOne(id, user.merchant?.id);
  }

  @Patch(':id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
  @ApiOperation({
    summary: 'Update a Delivery Assignment by ID',
    description:
      'Moves the assignment through its lifecycle (pending→assigned→picked_up→in_transit→delivered; picked_up→delivered allowed; failed/cancelled from any non-terminal state) and/or binds a driver. Invalid transitions return 400. Timestamps are set by the server; a terminal state (delivered, failed, cancelled) returns the in-house driver to active.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the Delivery Assignment to update',
    example: 1,
  })
  @ApiBody({
    type: UpdateDeliveryAssignmentDto,
    description: 'Data to update the Delivery Assignment',
  })
  @ApiOkResponse({
    description: 'Delivery Assignment updated successfully.',
    schema: {
      example: {
        id: 1,
        order: 1,
        deliveryDriver: 1,
        delivery_status: 'cancelled',
        assigned_at: '2024-06-01T12:00:00Z',
        picked_up_at: '2024-06-01T12:15:00Z',
        delivered_at: '2024-06-01T12:30:00Z',
        status: 'inactive',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or ID parameter',
    schema: {
      example: {
        statusCode: 400,
        message:
          "Invalid delivery status transition: 'assigned' → 'delivered'. Allowed from 'assigned': picked_up, failed, cancelled",
        error: 'Bad Request',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Delivery Assignment not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Delivery Assignment with ID 1 not found',
        error: 'Not Found',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. Insufficient role.',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Not authorized. Authentication required',
    schema: {
      example: {
        statusCode: 401,
        message: 'Authentication required',
        error: 'Unauthorized',
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    schema: {
      example: {
        statusCode: 500,
        message: 'Internal server error',
        error: 'InternalServerError',
      },
    },
  })
  @ApiConflictResponse({ description: 'Driver is already on a delivery' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDeliveryAssignmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OneDeliveryAssignmentResponseDto> {
    return this.deliveryAssignmentService.update(id, dto, user.merchant?.id);
  }

  @Delete(':id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
  @ApiOperation({
    summary: 'Delete a Delivery Assignment by ID',
    description:
      'Soft-deletes the assignment. An open assignment is cancelled first and its in-house driver returned to active.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the Delivery Assignment to delete',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Delivery Assignment deleted successfully',
    schema: {
      example: {
        id: 1,
        order: 1,
        deliveryDriver: 1,
        delivery_status: 'cancelled',
        assigned_at: '2024-06-01T12:00:00Z',
        picked_up_at: '2024-06-01T12:15:00Z',
        delivered_at: '2024-06-01T12:30:00Z',
        status: 'deleted',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid ID parameter',
    schema: {
      example: {
        statusCode: 400,
        message: 'ID must be a number',
        error: 'Bad Request',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Delivery Assignment not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Delivery Assignment with ID 1 not found',
        error: 'Not Found',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. Insufficient role.',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Not authorized. Authentication required',
    schema: {
      example: {
        statusCode: 401,
        message: 'Authentication required',
        error: 'Unauthorized',
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    schema: {
      example: {
        statusCode: 500,
        message: 'Internal server error',
        error: 'InternalServerError',
      },
    },
  })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OneDeliveryAssignmentResponseDto> {
    return this.deliveryAssignmentService.remove(id, user.merchant?.id);
  }
}
