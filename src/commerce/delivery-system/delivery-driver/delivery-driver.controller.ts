//src/commerce/delivery-system/delivery-driver/delivery-driver.controller.ts
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
import { DeliveryDriverService } from './delivery-driver.service';
import { CreateDeliveryDriverDto } from './dto/create-delivery-driver.dto';
import {
  DeliveryDriverResponseDto,
  OneDeliveryDriverResponseDto,
} from './dto/delivery-driver-response.dto';
import { PaginatedDeliveryDriverResponseDto } from './dto/paginated-delivery-driver-response.dto';
import { QueryDeliveryDriverDto } from './dto/query-delivery-driver.dto';
import { UpdateDeliveryDriverDto } from './dto/update-delivery-driver.dto';
import { DriverShiftDto } from './dto/driver-shift.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';

@ApiTags('Commerce - Delivery System - Delivery Driver')
@ApiBearerAuth()
@Controller('delivery-driver')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.DELIVERY_DRIVERS)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
export class DeliveryDriverController {
  constructor(private readonly deliveryDriverService: DeliveryDriverService) {}
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
    summary: 'Create a delivery driver',
    description: 'Endpoint to create a delivery driver for a delivery system.',
  })
  @ApiBody({
    type: CreateDeliveryDriverDto,
    description: 'Details of the delivery driver to be created.',
  })
  @ApiCreatedResponse({
    type: DeliveryDriverResponseDto,
    schema: {
      example: {
        name: 'Mario Lopez',
        phone: '+18095551234',
        vehicleType: 'car',
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
          'Delivery driver name must be a string',
          'status must be one of: active, inactive, off_duty (on_delivery is set only by the assignment flow)',
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
  @ApiConflictResponse({
    description: 'Another driver of the merchant already uses this phone',
  })
  async create(
    @Body() dto: CreateDeliveryDriverDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OneDeliveryDriverResponseDto> {
    return this.deliveryDriverService.create(dto, user.merchant?.id);
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
    summary: 'Get a list of Delivery Drivers',
    description: 'Endpoint to retrieve a paginated list of Delivery Drivers.',
  })
  @ApiOkResponse({
    description: 'List of Delivery Drivers retrieved successfully.',
    type: PaginatedDeliveryDriverResponseDto,
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
    @Query() query: QueryDeliveryDriverDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedDeliveryDriverResponseDto> {
    return this.deliveryDriverService.findAll(query, user.merchant?.id);
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
    summary: 'Delivery fleet KPI summary',
    description:
      'Drivers of the merchant (deleted excluded): total, available (active), en route (on_delivery) and unavailable (off_duty + inactive).',
  })
  @ApiOkResponse({
    description: 'Fleet KPIs.',
    schema: {
      example: {
        statusCode: 200,
        message: 'Delivery driver summary retrieved successfully',
        data: { total: 12, available: 5, en_route: 4, unavailable: 3 },
      },
    },
  })
  async summary(@CurrentUser() user: AuthenticatedUser) {
    return this.deliveryDriverService.summary(user.merchant?.id);
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
    summary: 'Get a Delivery Driver by ID',
    description: 'Endpoint to retrieve a single Delivery Driver by its ID.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the Delivery Driver to retrieve',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Delivery Driver retrieved successfully.',
    schema: {
      example: {
        id: 1,
        name: 'Mario Lopez',
        phone: '+18095551234',
        vehicleType: 'car',
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
    description: 'Delivery Driver not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Delivery Driver with ID 1 not found',
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
  ): Promise<OneDeliveryDriverResponseDto> {
    return this.deliveryDriverService.findOne(id, user.merchant?.id);
  }

  @Patch(':id/shift')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
  @ApiOperation({
    summary: 'Toggle the shift of a Delivery Driver',
    description:
      'on_shift=true → active, on_shift=false → off_duty. Refused (409) while the driver is on_delivery or inactive.',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiBody({ type: DriverShiftDto })
  @ApiOkResponse({ type: OneDeliveryDriverResponseDto })
  @ApiNotFoundResponse({ description: 'Delivery Driver not found' })
  @ApiConflictResponse({
    description: 'Driver is on a delivery or inactive',
    schema: {
      example: {
        statusCode: 409,
        message:
          'Delivery driver #1 is on a delivery; the shift can be changed once it finishes',
        error: 'Conflict',
      },
    },
  })
  async setShift(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DriverShiftDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OneDeliveryDriverResponseDto> {
    return this.deliveryDriverService.setShift(
      id,
      dto.on_shift,
      user.merchant?.id,
    );
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
    summary: 'Update a Delivery Driver by ID',
    description: 'Endpoint to update an existing Delivery Driver.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the Delivery Driver to update',
    example: 1,
  })
  @ApiBody({
    type: UpdateDeliveryDriverDto,
    description: 'Data to update the Delivery Driver',
  })
  @ApiOkResponse({
    description: 'Delivery Driver updated successfully.',
    schema: {
      example: {
        id: 1,
        name: 'Mario Lopez',
        phone: '+18095551234',
        vehicleType: 'car',
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
          'status must be one of: active, inactive, off_duty (on_delivery is set only by the assignment flow)',
        ],
        error: 'Bad Request',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Delivery Driver not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Delivery Driver with ID 1 not found',
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
  @ApiConflictResponse({
    description:
      'Phone already used by another driver, or status change while on_delivery',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDeliveryDriverDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OneDeliveryDriverResponseDto> {
    return this.deliveryDriverService.update(id, dto, user.merchant?.id);
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
    summary: 'Delete a Delivery Driver by ID',
    description: 'Endpoint to delete an existing Delivery Driver.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the Delivery Driver to delete',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Delivery Driver deleted successfully',
    schema: {
      example: {
        id: 1,
        name: 'Mario Lopez',
        phone: '+18095551234',
        vehicleType: 'car',
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
    description: 'Delivery Driver not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Delivery Driver with ID 1 not found',
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
  @ApiConflictResponse({ description: 'Driver is on a delivery' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OneDeliveryDriverResponseDto> {
    return this.deliveryDriverService.remove(id, user.merchant?.id);
  }
}
