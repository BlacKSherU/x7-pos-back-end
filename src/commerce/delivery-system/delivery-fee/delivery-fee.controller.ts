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
import { DeliveryFeeService } from './delivery-fee.service';
import { CreateDeliveryFeeDto } from './dto/create-delivery-fee.dto';
import {
  DeliveryFeeResponseDto,
  OneDeliveryFeeResponseDto,
} from './dto/delivery-fee-response.dto';
import { PaginatedDeliveryFeeResponseDto } from './dto/paginated-delivery-fee-response.dto';
import { QueryDeliveryFeeDto } from './dto/query-delivery-fee.dto';
import { UpdateDeliveryFeeDto } from './dto/update-delivery-fee.dto';

@ApiTags('Delivery Fee')
@Controller('delivery-fee')
export class DeliveryFeeController {
  constructor(private readonly deliveryFeeService: DeliveryFeeService) {}
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
  ): Promise<OneDeliveryFeeResponseDto> {
    return this.deliveryFeeService.create(dto);
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
  ): Promise<PaginatedDeliveryFeeResponseDto> {
    return this.deliveryFeeService.findAll(query);
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
  ): Promise<OneDeliveryFeeResponseDto> {
    if (id <= 0) {
      throw new Error('ID must be a positive integer');
    }
    const deliveryFee = await this.deliveryFeeService.findOne(id);
    return deliveryFee;
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
  ): Promise<OneDeliveryFeeResponseDto> {
    return this.deliveryFeeService.update(id, dto);
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
  ): Promise<OneDeliveryFeeResponseDto> {
    return this.deliveryFeeService.remove(id);
  }
}
