//src/commerce/delivery-system/delivery-zone/delivery-zone.controller.ts
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
import { DeliveryZoneService } from './delivery-zone.service';
import { CreateDeliveryZoneDto } from './dto/create-delivery-zone.dto';
import {
  DeliveryZoneResponseDto,
  OneDeliveryZoneResponseDto,
} from './dto/delivery-zone-response.dto';
import { PaginatedDeliveryZoneResponseDto } from './dto/paginated-delivery-zone-response.dto';
import { QueryDeliveryZoneDto } from './dto/query-delivery-zone.dto';
import { UpdateDeliveryZoneDto } from './dto/update-delivery-zone.dto';

@ApiTags('Delivery Zone')
@Controller('delivery-zone')
export class DeliveryZoneController {
  constructor(private readonly deliveryZoneService: DeliveryZoneService) {}
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
    summary: 'Create a delivery zone',
    description: 'Endpoint to create a delivery zone for a delivery system.',
  })
  @ApiBody({
    type: CreateDeliveryZoneDto,
    description: 'Details of the delivery zone to be created.',
  })
  @ApiCreatedResponse({
    type: DeliveryZoneResponseDto,
    schema: {
      example: {
        merchant: 1,
        name: 'Porvidencia 1459, Santiago',
        description: 'Zona de entrega en el sector de Providencia, Santiago.',
        geojson:
          '{"type":"Polygon","coordinates":[[[-69.9384,18.4662],[-69.9384,18.4662],[-69.9384,18.4662],[-69.9384,18.4662]]]}',
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
          'Delivery zone name must be a string',
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
    @Body() dto: CreateDeliveryZoneDto,
  ): Promise<OneDeliveryZoneResponseDto> {
    return this.deliveryZoneService.create(dto);
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
    summary: 'Get a list of Delivery Zones',
    description: 'Endpoint to retrieve a paginated list of Delivery Zones.',
  })
  @ApiOkResponse({
    description: 'List of Delivery Zones retrieved successfully.',
    type: PaginatedDeliveryZoneResponseDto,
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
    @Query() query: QueryDeliveryZoneDto,
  ): Promise<PaginatedDeliveryZoneResponseDto> {
    return this.deliveryZoneService.findAll(query);
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
    summary: 'Get a Delivery Zone by ID',
    description: 'Endpoint to retrieve a single Delivery Zone by its ID.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the Delivery Zone to retrieve',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Delivery Zone retrieved successfully.',
    schema: {
      example: {
        id: 1,
        merchant: 1,
        name: 'Porvidencia 1459, Santiago',
        description: 'Zona de entrega en el sector de Providencia, Santiago.',
        geojson: {
          type: 'Polygon',
          coordinates: [
            [
              [-70.6483, -33.4569],
              [-70.6483, -33.4569],
              [-70.6483, -33.4569],
              [-70.6483, -33.4569],
            ],
          ],
        },
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
    description: 'Delivery Zone not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Delivery Zone with ID 1 not found',
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
  ): Promise<OneDeliveryZoneResponseDto> {
    if (id <= 0) {
      throw new Error('ID must be a positive integer');
    }
    const deliveryZone = await this.deliveryZoneService.findOne(id);
    return deliveryZone;
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
    summary: 'Update a Delivery Zone by ID',
    description: 'Endpoint to update an existing Delivery Zone.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the Delivery Zone to update',
    example: 1,
  })
  @ApiBody({
    type: UpdateDeliveryZoneDto,
    description: 'Data to update the Delivery Zone',
  })
  @ApiOkResponse({
    description: 'Delivery Zone updated successfully.',
    schema: {
      example: {
        id: 1,
        merchant: 1,
        name: 'Porvidencia 1459, Santiago',
        description: 'Zona de entrega en el sector de Providencia, Santiago.',
        geojson:
          '{"type":"Polygon","coordinates":[[[-69.9384,18.4662],[-69.9384,18.4662],[-69.9384,18.4662],[-69.9384,18.4662]]]}',
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
    description: 'Delivery Zone not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Delivery Zone with ID 1 not found',
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
    @Body() dto: UpdateDeliveryZoneDto,
  ): Promise<OneDeliveryZoneResponseDto> {
    return this.deliveryZoneService.update(id, dto);
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
    summary: 'Delete a Delivery Zone by ID',
    description: 'Endpoint to delete an existing Delivery Zone.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the Delivery Zone to delete',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Delivery Zone deleted successfully',
    schema: {
      example: {
        id: 1,
        merchant: 1,
        name: 'Porvidencia 1459, Santiago',
        description: 'Zona de entrega en el sector de Providencia, Santiago.',
        geojson:
          '{"type":"Polygon","coordinates":[[[-69.9384,18.4662],[-69.9384,18.4662],[-69.9384,18.4662],[-69.9384,18.4662]]]}',
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
    description: 'Delivery Zone not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Delivery Zone with ID 1 not found',
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
  ): Promise<OneDeliveryZoneResponseDto> {
    return this.deliveryZoneService.remove(id);
  }
}
