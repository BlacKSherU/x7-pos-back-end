//src/qr-code/qr-menu/qr-menu.controller
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
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiOkResponse,
  ApiParam,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { QrMenuService } from './qr-menu.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/constants/role.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { Scope } from 'src/users/constants/scope.enum';
import { CreateQRMenuDto } from './dto/create-qr-menu.dto';
import {
  OneQRMenuResponseDto,
  QRMenuResponseDto,
} from './dto/qr-menu-response.dto';
import { PaginatedQRMenuResponseDto } from './dto/paginated-qr-menu-response.dto';
import { QueryQRMenuDto } from './dto/query-qr-menu.dto';
import { UpdateQRMenuDto } from './dto/update-qr-menu.dto';

@ApiTags('QR Menu')
@Controller('qr-menu')
export class QrMenuController {
  constructor(private readonly qrMenuService: QrMenuService) {}
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
    summary: 'Create a new QR Menu',
    description: 'Endpoint for creating a new QR Menu',
  })
  @ApiBody({
    type: CreateQRMenuDto,
    description: 'Require data for a new QR Menu',
  })
  @ApiCreatedResponse({
    description: 'The QR Menu has been created successfully',
    type: QRMenuResponseDto,
    schema: {
      example: {
        id: 1,
        merchant: { id: 5, name: 'Acme Corp' },
        name: 'Star Menu QR',
        description: 'This is the QR Menu of the Restaurant',
        status: 'active',
        design_theme: 'Texas Theme',
        qr_type: 'DELIVERY',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'merchant must be a number',
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
  async create(@Body() dto: CreateQRMenuDto): Promise<OneQRMenuResponseDto> {
    return this.qrMenuService.create(dto);
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
    summary: 'Get All QR Menu',
    description: 'Endpoint for get ALL of the QR Menu.',
  })
  @ApiOkResponse({
    description: 'Paginated list of QR Menus',
    type: PaginatedQRMenuResponseDto,
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
    @Query() query: QueryQRMenuDto,
  ): Promise<PaginatedQRMenuResponseDto> {
    return this.qrMenuService.findAll(query);
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
    summary: 'Get a QR Menu by ID',
    description: 'Endpoint to retrieve a specific QR Menu using its ID.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'QR Menu ID',
    example: 1,
  })
  @ApiOkResponse({
    description: 'QR Menu retrieved successfully',
    type: QRMenuResponseDto,
    schema: {
      example: {
        id: 1,
        merchant: { id: 5, name: 'Acme Corp' },
        name: 'Star Menu QR',
        description: 'This is the QR Menu of the Restaurant',
        status: 'active',
        design_theme: 'Texas Theme',
        qr_type: 'DELIVERY',
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
    description: 'Not Found: QR Menu not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'QR Menu not found',
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
  ): Promise<OneQRMenuResponseDto> {
    if (id <= 0) {
      throw new BadRequestException('Invalid ID. Must be a positive number.');
    }
    const qrMenu = await this.qrMenuService.findOne(id);
    return qrMenu;
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
    summary: 'Update a QR Menu',
    description: 'Endpoint to update an existing QR Menu by its ID.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'QR Menu ID',
    example: 1,
  })
  @ApiBody({
    type: UpdateQRMenuDto,
    description: 'Data for updating the QR Menu',
  })
  @ApiOkResponse({
    description: 'QR Menu updated successfully',
    type: QRMenuResponseDto,
    schema: {
      example: {
        id: 1,
        merchant: { id: 5, name: 'Acme Corp' },
        name: 'Star Menu QR',
        description: 'This is the QR Menu of the Restaurant',
        status: 'inactive',
        design_theme: 'Texas Theme',
        qr_type: 'DELIVERY',
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
    description: 'Not Found: QR Menu not found',
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
    @Body() dto: UpdateQRMenuDto,
  ): Promise<OneQRMenuResponseDto> {
    return this.qrMenuService.update(id, dto);
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
    summary: 'Delete a QR Menu',
    description: 'Endpoint to delete an existing QR Menu by its ID.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'QR Menu ID',
    example: 1,
  })
  @ApiOkResponse({
    description: 'QR Menu retrieved successfully',
    type: QRMenuResponseDto,
    schema: {
      example: {
        id: 1,
        merchant: { id: 5, name: 'Acme Corp' },
        name: 'Star Menu QR',
        description: 'This is the QR Menu of the Restaurant',
        status: 'deleted',
        design_theme: 'Texas Theme',
        qr_type: 'DELIVERY',
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
    description: 'Not Found: QR Menu not found',
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
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OneQRMenuResponseDto> {
    return this.qrMenuService.remove(id);
  }
}
