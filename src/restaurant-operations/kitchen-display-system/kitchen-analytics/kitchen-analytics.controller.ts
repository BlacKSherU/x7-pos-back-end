import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { KitchenAnalyticsService } from './kitchen-analytics.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { FeatureAccessGuard } from 'src/auth/guards/feature-access.guard';
import { RequireFeature } from 'src/auth/decorators/require-feature.decorator';
import { SUBSCRIPTION_FEATURE_IDS } from 'src/common/subscription/subscription-feature-ids';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiQuery,
  ApiTags,
  ApiExtraModels,
} from '@nestjs/swagger';
import { PrepTimeResponseDto } from './dto/prep-time-response.dto';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { GetCancelledOrdersDto } from './dto/get-cancelled-orders.dto';
import { GetExecutiveAnalyticsQueryDto } from './dto/executive-analytics.dto';

@ApiExtraModels(ErrorResponse, PrepTimeResponseDto, GetCancelledOrdersDto)
@ApiTags('Restaurant operations - Kitchen Display System - Kitchen Analytics')
@ApiBearerAuth()
@Controller('kitchen-analytics')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.KITCHEN_PERFORMANCE)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
export class KitchenAnalyticsController {
  constructor(private readonly service: KitchenAnalyticsService) {}

  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @Get('prep-time')
  @ApiOperation({
    summary:
      'Get average preparation time grouped by category, station, day and hour',
  })
  @ApiOkResponse({ type: PrepTimeResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Missing or invalid authentication token',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - Insufficient permissions to access prep time analytics',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  async getPrepTime(@CurrentUser() user: AuthenticatedUser) {
    const merchantId = user.merchant.id;

    const data = await this.service.getAveragePrepTime(merchantId);

    return {
      statusCode: 200,
      message: 'Prep time analytics retrieved successfully',
      data,
    };
  }

  @Get('cancelled-orders')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary:
      'Get list of cancelled kitchen orders with estimated financial loss',
    description:
      'Retrieves all cancelled kitchen order records for the authenticated merchant within an optional date range.',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Filter start date (ISO string, e.g. 2026-09-01T00:00:00Z)',
    example: '2026-09-01T00:00:00.000Z',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Filter end date (ISO string, e.g. 2026-09-30T23:59:59Z)',
    example: '2026-09-30T23:59:59.000Z',
  })
  @ApiOkResponse({
    description: 'Cancelled kitchen orders retrieved successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'Cancelled kitchen orders retrieved successfully',
        data: [
          {
            kitchenOrderId: 101,
            reason: 'CUSTOMER_CANCELLED',
            cancelledBy: 5,
            cancelledAt: '2026-09-30T14:30:00.000Z',
            estimatedLoss: 45.5,
          },
          {
            kitchenOrderId: 104,
            reason: 'OUT_OF_STOCK',
            cancelledBy: 7,
            cancelledAt: '2026-09-30T16:15:00.000Z',
            estimatedLoss: 28.0,
          },
        ],
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Missing or invalid authentication token',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - Insufficient permissions to access cancelled orders',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  async getCancelledOrders(
    @Query() query: GetCancelledOrdersDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.service.getCancelledKitchenOrders(
      user.merchant.id,
      query.startDate,
      query.endDate,
    );

    return {
      statusCode: 200,
      message: 'Cancelled kitchen orders retrieved successfully',
      data,
    };
  }

  @Get('cancelled-orders/summary')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Get analytical cancellation summary metrics grouped by reason',
    description:
      'Provides aggregated cancellation metrics including total order counts and estimated financial loss grouped by cancellation reason.',
  })
  @ApiOkResponse({
    description: 'Cancellation summary retrieved successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'Cancellation summary retrieved successfully',
        data: [
          {
            reason: 'CUSTOMER_CANCELLED',
            total: 12,
            estimatedLoss: 340.5,
          },
          {
            reason: 'OUT_OF_STOCK',
            total: 5,
            estimatedLoss: 120.0,
          },
          {
            reason: 'KITCHEN_DELAY',
            total: 3,
            estimatedLoss: 85.0,
          },
        ],
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Missing or invalid authentication token',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - Insufficient permissions to access cancellation summary',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  async getSummary(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.service.getCancellationSummary(user.merchant.id);

    return {
      statusCode: 200,
      message: 'Cancellation summary retrieved successfully',
      data,
    };
  }

  @Get('executive-summary')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Get executive kitchen analytics, SOS metrics, and SLA throughput',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Missing or invalid authentication token',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Insufficient permissions',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  async getExecutiveSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetExecutiveAnalyticsQueryDto,
  ) {
    const merchantId = user.merchant.id;
    const data = await this.service.getExecutiveAnalytics(
      merchantId,
      query.startDate,
      query.endDate,
      query.stationId,
      query.targetSlaMinutes,
    );

    return {
      statusCode: 200,
      message: 'Executive kitchen analytics retrieved successfully',
      data,
    };
  }

  @Get('station-efficiency')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Station Efficiency Comparison Matrix (Historia X7P-4205)',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Missing or invalid authentication token',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Insufficient permissions',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  async getStationEfficiency(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetExecutiveAnalyticsQueryDto,
  ) {
    const merchantId = user.merchant.id;
    const data = await this.service.getStationEfficiencyMatrix(
      merchantId,
      query.startDate,
      query.endDate,
      query.stationId,
    );

    return {
      statusCode: 200,
      message: 'Station efficiency comparison matrix retrieved successfully',
      data,
    };
  }

  @Get('bottlenecks')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary:
      'Slowest item prep duration & bottleneck ranking (Historia X7P-4205)',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Missing or invalid authentication token',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Insufficient permissions',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  async getBottlenecks(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetExecutiveAnalyticsQueryDto,
  ) {
    const merchantId = user.merchant.id;
    const data = await this.service.getItemBottlenecks(
      merchantId,
      query.startDate,
      query.endDate,
      query.stationId,
    );

    return {
      statusCode: 200,
      message: 'Kitchen item bottlenecks retrieved successfully',
      data,
    };
  }

  @Get()
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Primary endpoint for kitchen analytics overview and SOS metrics',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Missing or invalid authentication token',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Insufficient permissions',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  async getAnalyticsRoot(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetExecutiveAnalyticsQueryDto,
  ) {
    const merchantId = user.merchant.id;
    const data = await this.service.getExecutiveAnalytics(
      merchantId,
      query.startDate,
      query.endDate,
      query.stationId,
      query.targetSlaMinutes,
    );

    return {
      statusCode: 200,
      message: 'Kitchen analytics overview retrieved successfully',
      data,
    };
  }
}
