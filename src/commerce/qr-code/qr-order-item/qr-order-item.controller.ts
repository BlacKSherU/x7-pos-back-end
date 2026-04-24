//src/qr-code/qr-order-item/qr-order-item.controller.ts
import {
  Controller,
  Post,
  UseGuards,
  Body,
  Query,
  Get,
  Param,
  ParseIntPipe,
  BadRequestException,
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
import { QROrderItemService } from './qr-order-item.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { CreateQROrderItemDto } from './dto/create-qr-order-item.dto';
import {
  OneQROrderItemResponseDto,
  QROrderItemResponseDto,
} from './dto/qr-order-item-response.dto';
import { PaginatedQROrderItemResponseDto } from './dto/paginated-qr-order-item-response.dto';
import { QueryQROrderItemDto } from './dto/query-qr-ordero-item.dto';
import { UpdateQrOrderItemDto } from './dto/update-qr-order-item.dto';

@ApiTags('QR Order Item')
@Controller('qr-order-item')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.QR_ORDER_ITEMS)
export class QROrderItemController {
  constructor(private readonly qrOrderItemService: QROrderItemService) {}
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
    summary: 'Create a new QR order item',
    description: 'Endpoint to create a new QR order item',
  })
  @ApiBody({
    type: CreateQROrderItemDto,
    description: 'Require data to create a new QR order item',
  })
  @ApiCreatedResponse({
    description: 'The QR order item has been successfully created.',
    type: QROrderItemResponseDto,
    schema: {
      example: {
        id: 1,
        qrOrder: 1,
        product: 1,
        variant: 1,
        quantity: 2,
        price: 19.99,
        total_price: 39.98,
        notes: 'No onions, please',
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
          'QR Order Item must be a number',
          'status must be one of the following values: active, inactive',
        ],
        error: 'Bad Request',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized, Authentication required',
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
    @Body() dto: CreateQROrderItemDto,
  ): Promise<OneQROrderItemResponseDto> {
    return this.qrOrderItemService.create(dto);
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
    summary: 'Get a list of QR Order Items',
    description: 'Endpoint to retrieve a paginated list of QR Order Items.',
  })
  @ApiOkResponse({
    description: 'List of QR Order Items retrieved successfully.',
    type: [PaginatedQROrderItemResponseDto],
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
    @Query() query: QueryQROrderItemDto,
  ): Promise<PaginatedQROrderItemResponseDto> {
    return this.qrOrderItemService.findAll(query);
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
    summary: 'Get a QR Order Item by ID',
    description: 'Endpoint to retrieve a single QR Order Item by its ID.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the QR Order Item to retrieve',
    example: 1,
  })
  @ApiOkResponse({
    description: 'QR Order Item retrieved successfully.',
    schema: {
      example: {
        id: 1,
        qrOrder: 1,
        product: 1,
        variant: 1,
        quantity: 2,
        price: 19.99,
        total_price: 39.98,
        notes: 'No onions, please',
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
    description: 'QR Order Item not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'QR Order Item with ID 1 not found',
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
  ): Promise<OneQROrderItemResponseDto> {
    if (id <= 0) {
      throw new BadRequestException('ID must be a positive integer');
    }
    const qrOrderItem = await this.qrOrderItemService.findOne(id);
    return qrOrderItem;
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
    summary: 'Update a QR Order Item by ID',
    description: 'Endpoint to update a single QR Order Item by its ID.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the QR Order Item to update',
    example: 1,
  })
  @ApiBody({
    type: UpdateQrOrderItemDto,
    description: 'Data to update the QR Order Item',
  })
  @ApiOkResponse({
    description: 'QR Order Item updated successfully.',
    schema: {
      example: {
        id: 1,
        qrOrder: 1,
        product: 1,
        variant: 1,
        quantity: 2,
        price: 19.99,
        total_price: 39.98,
        notes: 'No onions, No tomatoes, please',
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
    @Body() dto: UpdateQrOrderItemDto,
  ): Promise<OneQROrderItemResponseDto> {
    return this.qrOrderItemService.update(id, dto);
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
    summary: 'Delete a QR Order Item by ID',
    description: 'Endpoint to delete a single QR Order Item by its ID.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the QR Order Item to delete',
    example: 1,
  })
  @ApiOkResponse({
    description: 'QR Order Item deleted successfully.',
    schema: {
      example: {
        id: 1,
        qrOrder: 1,
        product: 1,
        variant: 1,
        quantity: 2,
        price: 19.99,
        total_price: 39.98,
        notes: 'No onions, No tomatoes, please',
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
    description: 'QR Order Item not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'QR Order Item with ID 1 not found',
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
    description: 'Unauthorized. Authentication required',
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
    @Param('id', ParseIntPipe)
    id: number,
  ): Promise<OneQROrderItemResponseDto> {
    return this.qrOrderItemService.remove(id);
  }
}
