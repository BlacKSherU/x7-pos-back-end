//src/qr-code/qr-menu-section/qr-menu-section.controller
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
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
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { UserRole } from 'src/users/constants/role.enum';
import { Scope } from 'src/users/constants/scope.enum';
import { CreateQRMenuSectionDto } from './dto/create-qr-menu-section.dto';
import {
  OneQRMenuSectionResponseDto,
  QRMenuSectionResponseDto,
} from './dto/qr-menu-section-response.dto';
import { QRMenuSectionService } from './qr-menu-section.service';
import { PaginatedQRMenuSectionResponseDto } from './dto/paginated-qr-menu-section-response.dto';
import { QueryQRMenuSectionDto } from './dto/query-qr-menu-section.dto';
import { UpdateQRMenuSectionDto } from './dto/update-qr-menu-section.dto';

@ApiTags('QR Menu Section')
@Controller('qr-menu-section')
export class QrMenuSectionController {
  constructor(private readonly qrMenuSectionService: QRMenuSectionService) {}
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
    summary: 'Create a new QR Menu Section',
    description: 'Endpoint for creating a new QR Menu Section',
  })
  @ApiBody({
    type: QRMenuSectionResponseDto,
    description: 'Require data for a new QR Menu Section',
  })
  @ApiCreatedResponse({
    description: 'The QR Menu Section has been created successfully',
    type: QRMenuSectionResponseDto,
    schema: {
      example: {
        id: 1,
        qrMenu: { id: 5, name: 'QR MEnu' },
        name: 'Star Menu QR, Drinks Section',
        description: 'This is the Drink Section QR Menu of the Restaurant',
        status: 'active',
        display_order: 10,
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
    @Body() dto: CreateQRMenuSectionDto,
  ): Promise<OneQRMenuSectionResponseDto> {
    return this.qrMenuSectionService.create(dto);
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
    summary: 'Get All QR Menu Section',
    description: 'Endpoint for get ALL of the QR Menu Section.',
  })
  @ApiOkResponse({
    description: 'Paginated list of QR Menu Sections',
    type: PaginatedQRMenuSectionResponseDto,
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
    @Query() query: QueryQRMenuSectionDto,
  ): Promise<PaginatedQRMenuSectionResponseDto> {
    return this.qrMenuSectionService.findAll(query);
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
    summary: 'Get a QR Menu Section by ID',
    description:
      'Endpoint to retrieve a specific QR Menu Section using its ID.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'QR Menu Section ID',
    example: 1,
  })
  @ApiOkResponse({
    description: 'QR Menu Section retrieved successfully',
    schema: {
      example: {
        id: 1,
        qrMenu: { id: 5, name: 'QR MEnu' },
        name: 'Star Menu QR, Drinks Section',
        description: 'This is the Drink Section QR Menu of the Restaurant',
        status: 'active',
        display_order: 10,
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
    description: 'Not Found: QR Menu Section not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'QR Menu Section not found',
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
  ): Promise<OneQRMenuSectionResponseDto> {
    if (id <= 0) {
      throw new BadRequestException('Invalid ID. Must be a positive number.');
    }
    const qrMenu = await this.qrMenuSectionService.findOne(id);
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
    summary: 'Update a QR Menu Section',
    description: 'Endpoint to update an existing QR Menu Section by its ID.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'QR Menu Section ID',
    example: 1,
  })
  @ApiBody({
    type: UpdateQRMenuSectionDto,
    description: 'Data for updating the QR Menu Section',
  })
  @ApiOkResponse({
    description: 'QR Menu Section updated successfully',
    schema: {
      example: {
        id: 1,
        qrMenu: { id: 5, name: 'QR MEnu' },
        name: 'Star Menu QR, Drinks Section',
        description: 'This is the Drink Section QR Menu of the Restaurant',
        status: 'inactive',
        display_order: 10,
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
    description: 'Not Found: QR Menu Section not found',
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
    @Body() dto: UpdateQRMenuSectionDto,
  ): Promise<OneQRMenuSectionResponseDto> {
    return this.qrMenuSectionService.update(id, dto);
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
    summary: 'Delete a QR Menu Section',
    description: 'Endpoint to delete an existing QR Menu by its ID.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'QR Menu Section ID',
    example: 1,
  })
  @ApiOkResponse({
    description: 'QR Menu Section retrieved successfully',
    schema: {
      example: {
        id: 1,
        qrMenu: { id: 5, name: 'QR MEnu' },
        name: 'Star Menu QR, Drinks Section',
        description: 'This is the Drink Section QR Menu of the Restaurant',
        status: 'deleted',
        display_order: 10,
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
    description: 'Not Found: QR Menu Section not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'QR Menu Section not found',
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
  ): Promise<OneQRMenuSectionResponseDto> {
    return this.qrMenuSectionService.remove(id);
  }
}
