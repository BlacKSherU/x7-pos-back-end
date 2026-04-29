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
import { DeliveryAssignmentService } from './delivery-assignment.service';
import { CreateDeliveryAssignmentDto } from './dto/create-delivery-assignment.dto';
import {
  DeliveryAssignmentResponseDto,
  OneDeliveryAssignmentResponseDto,
} from './dto/delivery-assignment-response.dto';
import { PaginatedDeliveryAssignmentResponseDto } from './dto/paginated-delivery-assignment-response.dto';
import { QueryDeliveryAssignmentDto } from './dto/query-delivery-assignment.dto';
import { UpdateDeliveryAssignmentDto } from './dto/update-delivery-assignment.dto';

@ApiTags('Delivery Assignment')
@Controller('delivery-assignment')
export class DeliveryAssignmentController {
  constructor(
    private readonly deliveryAssignmentService: DeliveryAssignmentService,
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
    summary: 'Create a delivery assignment',
    description:
      'Endpoint to create a delivery assignment for a delivery system.',
  })
  @ApiBody({
    type: CreateDeliveryAssignmentDto,
    description: 'Details of the delivery assignment to be created.',
  })
  @ApiCreatedResponse({
    type: DeliveryAssignmentResponseDto,
    schema: {
      example: {
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
    description: 'Invalid input data',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'Delivery assignment date must be a date',
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
    @Body() dto: CreateDeliveryAssignmentDto,
  ): Promise<OneDeliveryAssignmentResponseDto> {
    return this.deliveryAssignmentService.create(dto);
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
  ): Promise<PaginatedDeliveryAssignmentResponseDto> {
    return this.deliveryAssignmentService.findAll(query);
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
  ): Promise<OneDeliveryAssignmentResponseDto> {
    if (id <= 0) {
      throw new Error('ID must be a positive integer');
    }
    const deliveryAssignment = await this.deliveryAssignmentService.findOne(id);
    return deliveryAssignment;
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
    summary: 'Update a Delivery Assignment by ID',
    description: 'Endpoint to update an existing Delivery Assignment.',
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
        delivery_status: 'unassigned',
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
        message: [
          'ID must be a number',
          'status must be one of the following values: active, inactive',
        ],
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
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDeliveryAssignmentDto,
  ): Promise<OneDeliveryAssignmentResponseDto> {
    return this.deliveryAssignmentService.update(id, dto);
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
    summary: 'Delete a Delivery Assignment by ID',
    description: 'Endpoint to delete an existing Delivery Assignment.',
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
        delivery_status: 'unassigned',
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
  ): Promise<OneDeliveryAssignmentResponseDto> {
    return this.deliveryAssignmentService.remove(id);
  }
}
