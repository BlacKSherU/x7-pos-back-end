//src/commerce/delivery-system/delivery-tracking/delivery-tracking.controller.ts
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
} from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { DeliveryTrackingService } from './delivery-tracking.service';
import { CreateDeliveryTrackingDto } from './dto/create-delivery-tracking.dto';
import {
  DeliveryTrackingResponseDto,
  OneDeliveryTrackingResponseDto,
} from './dto/delivery-tracking-response.dto';
import { PaginatedDeliveryTrackingResponseDto } from './dto/paginated-delivery-tracking-response.dto';
import { QueryDeliveryTrackingDto } from './dto/query-delivery-tracking.dto';
import { UpdateDeliveryTrackingDto } from './dto/update-delivery-tracking.dto';

@ApiTags('Delivery Tracking')
@Controller('delivery-tracking')
export class DeliveryTrackingController {
  constructor(
    private readonly deliveryTrackingService: DeliveryTrackingService,
  ) {}
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Create a delivery tracking',
    description:
      'Endpoint to create a delivery tracking for a delivery system.',
  })
  @ApiBody({
    type: CreateDeliveryTrackingDto,
    description: 'Details of the delivery tracking to be created.',
  })
  @ApiCreatedResponse({
    type: DeliveryTrackingResponseDto,
    schema: {
      example: {
        deliveryAssignment: 1,
        latitude: 37.7749,
        longitude: -122.4194,
        recorded_at: '2024-06-01T12:00:00Z',
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
    @Body() dto: CreateDeliveryTrackingDto,
  ): Promise<OneDeliveryTrackingResponseDto> {
    return this.deliveryTrackingService.create(dto);
  }

  @Get()
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({
    summary: 'Get a list of Delivery Trackings',
    description: 'Endpoint to retrieve a paginated list of Delivery Trackings.',
  })
  @ApiOkResponse({
    description: 'List of Delivery Trackings retrieved successfully.',
    type: PaginatedDeliveryTrackingResponseDto,
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
    @Query() query: QueryDeliveryTrackingDto,
  ): Promise<PaginatedDeliveryTrackingResponseDto> {
    return this.deliveryTrackingService.findAll(query);
  }

  @Get(':id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({
    summary: 'Get a Delivery Tracking by ID',
    description: 'Endpoint to retrieve a single Delivery Tracking by its ID.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the Delivery Tracking to retrieve',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Delivery Tracking retrieved successfully.',
    schema: {
      example: {
        id: 1,
        deliveryAssignment: 1,
        latitude: 37.7749,
        longitude: -122.4194,
        recorded_at: '2024-06-01T12:00:00Z',
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
    description: 'Delivery Tracking not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Delivery Tracking with ID 1 not found',
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
  ): Promise<OneDeliveryTrackingResponseDto> {
    if (id <= 0) {
      throw new Error('ID must be a positive integer');
    }
    const deliveryTracking = await this.deliveryTrackingService.findOne(id);
    return deliveryTracking;
  }

  @Patch(':id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({
    summary: 'Update a Delivery Tracking by ID',
    description: 'Endpoint to update an existing Delivery Tracking.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the Delivery Tracking to update',
    example: 1,
  })
  @ApiBody({
    type: UpdateDeliveryTrackingDto,
    description: 'Data to update the Delivery Tracking',
  })
  @ApiOkResponse({
    description: 'Delivery Tracking updated successfully.',
    schema: {
      example: {
        id: 1,
        deliveryAssignment: 1,
        latitude: 37.7749,
        longitude: -122.4194,
        recorded_at: '2024-06-01T12:00:00Z',
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
    description: 'Delivery Tracking not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Delivery Tracking with ID 1 not found',
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
    @Body() dto: UpdateDeliveryTrackingDto,
  ): Promise<OneDeliveryTrackingResponseDto> {
    return this.deliveryTrackingService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({
    summary: 'Delete a Delivery Tracking by ID',
    description: 'Endpoint to delete an existing Delivery Tracking.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the Delivery Tracking to delete',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Delivery Tracking deleted successfully',
    schema: {
      example: {
        id: 1,
        deliveryAssignment: 1,
        latitude: 37.7749,
        longitude: -122.4194,
        recorded_at: '2024-06-01T12:00:00Z',
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
    description: 'Delivery Tracking not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Delivery Tracking with ID 1 not found',
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
  ): Promise<OneDeliveryTrackingResponseDto> {
    return this.deliveryTrackingService.remove(id);
  }
}
