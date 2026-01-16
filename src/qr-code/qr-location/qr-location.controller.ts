// src/qr-code/qr-location/qr-location.controller.ts
import {
  Controller,
  Post,
  UseGuards,
  Body,
  Get,
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
  ApiOperation,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiParam,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { UserRole } from 'src/users/constants/role.enum';
import { Scope } from 'src/users/constants/scope.enum';
import {
  OneQRLocationResponseDto,
  QRLocationResponseDto,
} from './dto/qr-location-response.dto';
import { CreateQRLocationDto } from './dto/create-qr-location.dto';
import { QRLocationService } from './qr-location.service';
import { PaginatedQRLocationResponseDto } from './dto/paginated-qr-location-response.dto';
import { QueryQRLocationDto } from './dto/query-qr-location.dto';
import { UpdateQrLocationDto } from './dto/update-qr-location.dto';

@ApiTags('QR Location')
@Controller('qr-location')
export class QRLocationController {
  constructor(private readonly qrLocationService: QRLocationService) {}
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
    summary: 'Create a new QR Location',
    description: 'Endpoint for creating a new QR Location',
  })
  @ApiBody({
    type: QRLocationResponseDto,
    description: 'Require data for a new QR Location',
  })
  @ApiCreatedResponse({
    description: 'The QR Location has been successfully created.',
    type: QRLocationResponseDto,
    schema: {
      example: {
        id: 1,
        merchant: { id: 1, name: 'Merchant Name' },
        qr_menu: { id: 1, title: 'QR Menu Title' },
        table: { id: 1 },
        name: 'Main Entrance',
        qr_code_url: 'https://example.com/qr-code',
        qr_code_image: 'base64encodedimagestring',
        location_type: 'delivery',
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
          'QR Menu must be a number',
          'Table must be a number',
          'Merchant must be a number',
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
    @Body() dto: CreateQRLocationDto,
  ): Promise<OneQRLocationResponseDto> {
    return this.qrLocationService.create(dto);
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
    summary: 'Get All QR Location',
    description: 'Endpoint for get ALL of the QR Location.',
  })
  @ApiOkResponse({
    description: 'Paginated list of QR Location',
    type: PaginatedQRLocationResponseDto,
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
    @Query() query: QueryQRLocationDto,
  ): Promise<PaginatedQRLocationResponseDto> {
    return this.qrLocationService.findAll(query);
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
    summary: 'Get a QR Location by ID',
    description: 'Endpoint to retrieve a specific QR Location using its ID.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'QR Location ID',
    example: 1,
  })
  @ApiOkResponse({
    description: 'QR Location retrieved successfully',
    schema: {
      example: {
        id: 1,
        merchant: { id: 1, name: 'Merchant Name' },
        qr_menu: { id: 1, title: 'QR Menu Title' },
        table: { id: 1 },
        name: 'Main Entrance',
        qr_code_url: 'https://example.com/qr-code',
        qr_code_image: 'base64encodedimagestring',
        location_type: 'delivery',
        status: 'active',
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
    description: 'Not Found: QR Location not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'QR Location not found',
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
  ): Promise<OneQRLocationResponseDto> {
    if (id <= 0) {
      throw new BadRequestException('Invalid ID. Must be a positive number.');
    }
    const qrLocation = await this.qrLocationService.findOne(id);
    return qrLocation;
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
    summary: 'Update a QR Location',
    description: 'Endpoint to update an existing QR Location by its ID.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'QR Location ID',
    example: 1,
  })
  @ApiBody({
    type: CreateQRLocationDto,
    description: 'Data for updating the QR Location',
  })
  @ApiOkResponse({
    description: 'QR Location retrieved successfully',
    schema: {
      example: {
        id: 1,
        merchant: { id: 1, name: 'Merchant Name' },
        qr_menu: { id: 1, title: 'QR Menu Title' },
        table: { id: 1 },
        name: 'Main Entrance',
        qr_code_url: 'https://example.com/qr-code',
        qr_code_image: 'base64encodedimagestring',
        location_type: 'delivery',
        status: 'active',
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
    description: 'Not Found: QR Location not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'QR Location not found',
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
    @Body() dto: UpdateQrLocationDto,
  ): Promise<OneQRLocationResponseDto> {
    return this.qrLocationService.update(id, dto);
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
    summary: 'Delete a QR Location',
    description: 'Endpoint to delete an existing QR Location by its ID.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'QR Location ID',
    example: 1,
  })
  @ApiOkResponse({
    description: 'QR Location retrieved successfully',
    schema: {
      example: {
        id: 1,
        merchant: { id: 1, name: 'Merchant Name' },
        qr_menu: { id: 1, title: 'QR Menu Title' },
        table: { id: 1 },
        name: 'Main Entrance',
        qr_code_url: 'https://example.com/qr-code',
        qr_code_image: 'base64encodedimagestring',
        location_type: 'delivery',
        status: 'active',
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
    description: 'Not Found: QR Location not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'QR Location not found',
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
  ): Promise<OneQRLocationResponseDto> {
    return this.qrLocationService.remove(id);
  }
}
