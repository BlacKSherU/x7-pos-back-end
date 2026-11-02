//src/commerce/delivery-system/delivery-fee/delivery-fee.controller.ts
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
import { DeliveryFeeService } from './delivery-fee.service';
import { CreateDeliveryFeeDto } from './dto/create-delivery-fee.dto';
import {
  DeliveryFeeResponseDto,
  OneDeliveryFeeResponseDto,
} from './dto/delivery-fee-response.dto';
import { PaginatedDeliveryFeeResponseDto } from './dto/paginated-delivery-fee-response.dto';
import { QueryDeliveryFeeDto } from './dto/query-delivery-fee.dto';
import { UpdateDeliveryFeeDto } from './dto/update-delivery-fee.dto';
import { QuoteDeliveryFeeDto } from './dto/quote-delivery-fee.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';

@ApiTags('Commerce - Delivery System - Delivery Fee')
@ApiBearerAuth()
@Controller('delivery-fee')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.DELIVERY_FEES)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
export class DeliveryFeeController {
  constructor(private readonly deliveryFeeService: DeliveryFeeService) {}
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
    summary: 'Create a delivery fee',
    description: 'Endpoint to create a delivery fee for a delivery system.',
  })
  @ApiBody({
    type: CreateDeliveryFeeDto,
    description: 'Details of the delivery fee to be created.',
  })
  @ApiCreatedResponse({
    type: DeliveryFeeResponseDto,
    schema: {
      example: {
        deliveryZone: 1,
        base_fee: 5.99,
        per_km_fee: 1.5,
        min_order_amount: 10.99,
        free_above: 20.99,
        status: 'active',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'Delivery fee name must be a string',
          'status must be one of the following values: active, inactive',
        ],
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
    @Body() dto: CreateDeliveryFeeDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OneDeliveryFeeResponseDto> {
    return this.deliveryFeeService.create(dto, user.merchant?.id);
  }

  @Post('quote')
  @HttpCode(200)
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
  @ApiOperation({
    summary: 'Quote the delivery fee of an order',
    description:
      'Applies the active fee schedule of the zone: blocks below min_order_amount (eligible=false with the shortfall), 0.00 when subtotal >= free_above, otherwise base_fee + distance_km x per_km_fee. Inactive/maintenance zones are not eligible.',
  })
  @ApiOkResponse({ description: 'Fee quote (eligible or not).' })
  @ApiNotFoundResponse({ description: 'Delivery zone not found.' })
  async quote(
    @Body() dto: QuoteDeliveryFeeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveryFeeService.quote(dto, user.merchant?.id);
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
    summary: 'Get a list of Delivery Fees',
    description: 'Endpoint to retrieve a paginated list of Delivery Fees.',
  })
  @ApiOkResponse({
    description: 'List of Delivery Fees retrieved successfully.',
    type: PaginatedDeliveryFeeResponseDto,
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
    @Query() query: QueryDeliveryFeeDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedDeliveryFeeResponseDto> {
    return this.deliveryFeeService.findAll(query, user.merchant?.id);
  }

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
    summary: 'Delivery fee KPI summary',
    description:
      'Average base fee of the active fee schedules of active zones, number of active zones offering free delivery (free_above set), and active zones lacking an active fee schedule.',
  })
  @ApiOkResponse({
    description: 'Delivery fee KPIs.',
    schema: {
      example: {
        statusCode: 200,
        message: 'Delivery fee summary retrieved successfully',
        data: {
          active_zones: 5,
          active_fees: 4,
          avg_base_fee: 4.75,
          free_shipping_zones: 2,
          zones_without_fee_count: 1,
          zones_without_fee: [{ id: 7, name: 'Zona Sur' }],
        },
      },
    },
  })
  async summary(@CurrentUser() user: AuthenticatedUser) {
    return this.deliveryFeeService.summary(user.merchant?.id);
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
    summary: 'Get a Delivery Fee by ID',
    description: 'Endpoint to retrieve a single Delivery Fee by its ID.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the Delivery Fee to retrieve',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Delivery Fee retrieved successfully.',
    schema: {
      example: {
        id: 1,
        deliveryZone: 1,
        base_fee: 5.99,
        per_km_fee: 1.5,
        min_order_amount: 10.99,
        free_above: 20.99,
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
    description: 'Delivery Fee not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Delivery Fee with ID 1 not found',
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
  ): Promise<OneDeliveryFeeResponseDto> {
    return this.deliveryFeeService.findOne(id, user.merchant?.id);
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
    summary: 'Update a Delivery Fee by ID',
    description: 'Endpoint to update an existing Delivery Fee.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the Delivery Fee to update',
    example: 1,
  })
  @ApiBody({
    type: UpdateDeliveryFeeDto,
    description: 'Data to update the Delivery Fee',
  })
  @ApiOkResponse({
    description: 'Delivery Fee updated successfully.',
    schema: {
      example: {
        id: 1,
        deliveryZone: 1,
        base_fee: 5.99,
        per_km_fee: 1.5,
        min_order_amount: 10.99,
        free_above: 20.99,
        status: 'inactive',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or ID parameter',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'ID must be a number',
          'status must be one of the following values: active, inactive',
        ],
        error: 'Bad Request',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Delivery Fee not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Delivery Fee with ID 1 not found',
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
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDeliveryFeeDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OneDeliveryFeeResponseDto> {
    return this.deliveryFeeService.update(id, dto, user.merchant?.id);
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
    summary: 'Delete a Delivery Fee by ID',
    description: 'Endpoint to delete an existing Delivery Fee.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the Delivery Fee to delete',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Delivery Fee deleted successfully',
    schema: {
      example: {
        id: 1,
        deliveryZone: 1,
        base_fee: 5.99,
        per_km_fee: 1.5,
        min_order_amount: 10.99,
        free_above: 20.99,
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
    description: 'Delivery Fee not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Delivery Fee with ID 1 not found',
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
  ): Promise<OneDeliveryFeeResponseDto> {
    return this.deliveryFeeService.remove(id, user.merchant?.id);
  }
}
