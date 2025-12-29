import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  Query,
  Param,
  ParseIntPipe,
  BadRequestException,
  Patch,
  Delete,
} from '@nestjs/common';
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
import { QRMenuItemService } from './qr-menu-item.service';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { UserRole } from 'src/users/constants/role.enum';
import { Scope } from 'src/users/constants/scope.enum';
import {
  OneQRMenuItemResponseDto,
  QRMenuItemResponseDto,
} from './dto/qr-menu-item-response.dto';
import { CreateQRMenuItemDto } from './dto/create-qr-menu-item.dto';
import { PaginatedQRMenuItemResponseDto } from './dto/paginated-qr-menu-item-response.dto';
import { QueryQRMenuItemDto } from './dto/query-qr-menu-item.dto';
import { UpdateQRMenuItemDto } from './dto/update-qr-menu-item.dto';

@ApiTags('QR Menu Item')
@Controller('qr-menu-item')
export class QRMenuItemController {
  constructor(private readonly qrMenuItemService: QRMenuItemService) {}
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Create a new QR Menu Item',
    description: 'Endpoint for creating a new QR Menu Item',
  })
  @ApiBody({
    type: QRMenuItemResponseDto,
    description: 'Require data for a new QR Menu Section',
  })
  @ApiCreatedResponse({
    description: 'The QR Menu Item has been successfully created.',
    type: QRMenuItemResponseDto,
    schema: {
      example: {
        id: '1',
        qrMenuSection: {
          id: 1,
          name: 'Appetizers',
        },
        product: {
          id: 1,
          name: 'Spring Rolls',
        },
        variant: {
          id: 1,
          name: 'Vegetarian',
        },
        status: 'active',
        display_order: 1,
        notes: 'Delicious vegetarian spring rolls',
        is_visible: false,
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'QR Menu Item must be a number',
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
    @Body() dto: CreateQRMenuItemDto,
  ): Promise<OneQRMenuItemResponseDto> {
    return this.qrMenuItemService.create(dto);
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
  @ApiOperation({
    summary: 'Get All QR Menu Item',
    description: 'Endpoint for get ALL of the QR Menu Items.',
  })
  @ApiOkResponse({
    description: 'Paginated list of QR Menu Items',
    type: PaginatedQRMenuItemResponseDto,
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
    description: 'Forbidden: Insufficient role or permissions',
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
    @Query() query: QueryQRMenuItemDto,
  ): Promise<PaginatedQRMenuItemResponseDto> {
    return this.qrMenuItemService.findAll(query);
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({
    summary: 'Get a QR Menu Item by ID',
    description: 'Endpoint to retrieve a specific QR Menu Item using its ID.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'QR Menu Item ID',
    example: 1,
  })
  @ApiOkResponse({
    description: 'QR Menu S retrieved successfully',
    schema: {
      example: {
        id: '1',
        qrMenuSection: {
          id: 1,
          name: 'Appetizers',
        },
        product: {
          id: 1,
          name: 'Spring Rolls',
        },
        variant: {
          id: 1,
          name: 'Vegetarian',
        },
        status: 'active',
        display_order: 1,
        notes: 'Delicious vegetarian spring rolls',
        is_visible: false,
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Bad Request: Invalid ID format',
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid ID. Must be a positive number.',
        error: 'Bad Request',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized: Missing or invalid authentication token',
    schema: {
      example: {
        statusCode: 401,
        message: 'Authentication required',
        error: 'Unauthorized',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden: Insufficient permissions',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Not Found: QR Menu Item not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'QR Menu Item not found',
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
  ): Promise<OneQRMenuItemResponseDto> {
    if (id <= 0) {
      throw new BadRequestException('Invalid ID. Must be a positive number.');
    }
    const qrMenuItem = await this.qrMenuItemService.findOne(id);
    return qrMenuItem;
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({
    summary: 'Update a QR Menu Item',
    description: 'Endpoint to update an existing QR Menu Item by its ID.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'QR Menu Item ID',
    example: 1,
  })
  @ApiBody({
    type: UpdateQRMenuItemDto,
    description: 'Data for updating the QR Menu Item',
  })
  @ApiOkResponse({
    description: 'QR Menu Item retrieved successfully',
    schema: {
      example: {
        id: '1',
        qrMenuSection: {
          id: 1,
          name: 'Appetizers',
        },
        product: {
          id: 1,
          name: 'Spring Rolls',
        },
        variant: {
          id: 1,
          name: 'Vegetarian',
        },
        status: 'active',
        display_order: 1,
        notes: 'Delicious vegetarian spring rolls',
        is_visible: false,
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Bad Request: Invalid ID format or input data',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'Invalid ID. Must be a positive number.',
          'status must be one of the following values: active, inactive',
        ],
        error: 'Bad Request',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Not Found: QR Menu Item not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'QR Menu not found',
        error: 'Not Found',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden: Insufficient role or permissions',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized: Missing or invalid authentication token',
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
    @Body() dto: UpdateQRMenuItemDto,
  ): Promise<OneQRMenuItemResponseDto> {
    return this.qrMenuItemService.update(id, dto);
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({
    summary: 'Delete a QR Menu Item',
    description: 'Endpoint to delete an existing QR Menu by its ID.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'QR Menu Item ID',
    example: 1,
  })
  @ApiOkResponse({
    description: 'QR Menu Item retrieved successfully',
    schema: {
      example: {
        id: '1',
        qrMenuSection: {
          id: 1,
          name: 'Appetizers',
        },
        product: {
          id: 1,
          name: 'Spring Rolls',
        },
        variant: {
          id: 1,
          name: 'Vegetarian',
        },
        status: 'active',
        display_order: 1,
        notes: 'Delicious vegetarian spring rolls',
        is_visible: false,
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Bad Request: Invalid ID format',
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid ID. Must be a positive number.',
        error: 'Bad Request',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Not Found: QR Menu Item not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'QR Menu Item not found',
        error: 'Not Found',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden: Insufficient role or permissions',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized: Missing or invalid authentication token',
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
  ): Promise<OneQRMenuItemResponseDto> {
    return this.qrMenuItemService.remove(id);
  }
}
