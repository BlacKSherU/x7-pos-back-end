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
} from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
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

@ApiTags('Delivery Driver')
@Controller('delivery-driver')
export class DeliveryDriverController {
  constructor(private readonly deliveryDriverService: DeliveryDriverService) {}
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
        merchant: 1,
        name: 'Mario Lopez',
        phone: '809-555-1234',
        vehicleType: 'Car',
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
    @Body() dto: CreateDeliveryDriverDto,
  ): Promise<OneDeliveryDriverResponseDto> {
    return this.deliveryDriverService.create(dto);
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
  ): Promise<PaginatedDeliveryDriverResponseDto> {
    return this.deliveryDriverService.findAll(query);
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
        merchant: 1,
        name: 'Mario Lopez',
        phone: '809-555-1234',
        vehicleType: 'Car',
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
  ): Promise<OneDeliveryDriverResponseDto> {
    if (id <= 0) {
      throw new Error('ID must be a positive integer');
    }
    const deliveryDriver = await this.deliveryDriverService.findOne(id);
    return deliveryDriver;
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
        merchant: 1,
        name: 'Mario Lopez',
        phone: '809-555-1234',
        vehicleType: 'Car',
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
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDeliveryDriverDto,
  ): Promise<OneDeliveryDriverResponseDto> {
    return this.deliveryDriverService.update(id, dto);
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
        merchant: 1,
        name: 'Mario Lopez',
        phone: '809-555-1234',
        vehicleType: 'Car',
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
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OneDeliveryDriverResponseDto> {
    return this.deliveryDriverService.remove(id);
  }
}
