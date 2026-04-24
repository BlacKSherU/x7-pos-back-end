//src/qr-code/qr-order/qr-order.controller.ts
import {
  Controller,
  Post,
  UseGuards,
  Body,
  Get,
  Query,
  ParseIntPipe,
  BadRequestException,
  Param,
  Patch,
  Delete,
} from '@nestjs/common';
import { FeatureAccessGuard } from 'src/auth/guards/feature-access.guard';
import { RequireFeature } from 'src/auth/decorators/require-feature.decorator';
import { SUBSCRIPTION_FEATURE_IDS } from 'src/common/subscription/subscription-feature-ids';

import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import {
  OneQROrderResponseDto,
  QROrderResponseDto,
} from './dto/qr-order-response.dto';
import { CreateQROrderDto } from './dto/create-qr-order.dto';
import { QROrderService } from './qr-order.service';
import { PaginatedQROrderResponseDto } from './dto/paginated-qr-order-response.dto';
import { QueryQROrderDto } from './dto/query-qr-order.dto';
import { UpdateQROrderDto } from './dto/update-qr-order.dto';

@ApiTags('QR Orders')
@Controller('qr-order')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.QR_CODE_ORDERS)
export class QROrderController {
  constructor(private readonly qrOrderService: QROrderService) {}
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Create a new QR Order',
    description: 'Endpoint to create a new QR Order.',
  })
  @ApiBody({
    type: CreateQROrderDto,
    description: 'Require data for a new QR Order',
  })
  @ApiCreatedResponse({
    description: 'The QR Order has been successfully created.',
    type: QROrderResponseDto,
    schema: {
      example: {
        id: 1,
        merchant: 1,
        qrLocation: 1,
        customer: 1,
        table: 1,
        order: 1,
        notes: 'Special instructions for the order',
        total_amount: 29.99,
        qr_order_status: 'ACCEPTED',
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
          'QR Order must be a number',
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
  async create(@Body() dto: CreateQROrderDto): Promise<OneQROrderResponseDto> {
    return this.qrOrderService.create(dto);
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
  @UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
  @ApiOperation({
    summary: 'Get a list of QR Orders',
    description: 'Endpoint to retrieve a paginated list of QR Orders.',
  })
  @ApiOkResponse({
    description: 'List of QR Orders retrieved successfully.',
    type: PaginatedQROrderResponseDto,
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
    @Query() query: QueryQROrderDto,
  ): Promise<PaginatedQROrderResponseDto> {
    return this.qrOrderService.findAll(query);
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
  @UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
  @ApiOperation({
    summary: 'Get a QR Order by ID',
    description: 'Endpoint to retrieve a single QR Order by its ID.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the QR Order to retrieve',
    example: 1,
  })
  @ApiOkResponse({
    description: 'QR Order retrieved successfully.',
    schema: {
      example: {
        id: 1,
        merchant: 1,
        qrLocation: 1,
        customer: 1,
        table: 1,
        order: 1,
        notes: 'Special instructions for the order',
        total_amount: 29.99,
        qr_order_status: 'ACCEPTED',
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
    description: 'QR Order not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'QR Order with ID 1 not found',
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
  ): Promise<OneQROrderResponseDto> {
    if (id <= 0) {
      throw new BadRequestException('ID must be a positive integer');
    }
    const qrOrder = await this.qrOrderService.findOne(id);
    return qrOrder;
  }

  @Patch(':id')
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
  @ApiOperation({
    summary: 'Update a QR Order',
    description: 'Endpoint to update an existing QR Order.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the QR Order to update',
    example: 1,
  })
  @ApiBody({
    type: UpdateQROrderDto,
    description: 'Data to update the QR Order',
  })
  @ApiOkResponse({
    description: 'QR Order updated successfully.',
    schema: {
      example: {
        id: 1,
        merchant: 1,
        qrLocation: 1,
        customer: 1,
        table: 1,
        order: 1,
        notes: 'Updated instructions for the order',
        total_amount: 39.99,
        qr_order_status: 'COMPLETED',
        status: 'active',
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
    description: 'QR Order not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'QR Order with ID 1 not found',
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
    @Body() dto: UpdateQROrderDto,
  ): Promise<OneQROrderResponseDto> {
    return this.qrOrderService.update(id, dto);
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
  @UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
  @ApiOperation({
    summary: 'Delete a QR Order',
    description: 'Endpoint to delete an existing QR Order.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the QR Order to delete',
    example: 1,
  })
  @ApiOkResponse({
    description: 'QR Order deleted successfully.',
    schema: {
      example: {
        id: 1,
        merchant: 1,
        qrLocation: 1,
        customer: 1,
        table: 1,
        order: 1,
        notes: 'Special instructions for the order',
        total_amount: 29.99,
        qr_order_status: 'ACCEPTED',
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
    description: 'QR Order not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'QR Order with ID 1 not found',
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
  ): Promise<OneQROrderResponseDto> {
    return this.qrOrderService.remove(id);
  }
}
