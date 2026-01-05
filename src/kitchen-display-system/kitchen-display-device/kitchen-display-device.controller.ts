import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { KitchenDisplayDeviceService } from './kitchen-display-device.service';
import { CreateKitchenDisplayDeviceDto } from './dto/create-kitchen-display-device.dto';
import { UpdateKitchenDisplayDeviceDto } from './dto/update-kitchen-display-device.dto';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiBody,
  ApiForbiddenResponse,
  ApiQuery,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { KitchenDisplayDeviceResponseDto, OneKitchenDisplayDeviceResponseDto } from './dto/kitchen-display-device-response.dto';
import { GetKitchenDisplayDeviceQueryDto } from './dto/get-kitchen-display-device-query.dto';
import { PaginatedKitchenDisplayDeviceResponseDto } from './dto/paginated-kitchen-display-device-response.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/constants/role.enum';
import { Scope } from 'src/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';

@ApiTags('Kitchen Display Devices')
@ApiBearerAuth()
@Controller('kitchen-display-devices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class KitchenDisplayDeviceController {
  constructor(private readonly kitchenDisplayDeviceService: KitchenDisplayDeviceService) {}

  @Post()
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Create a new Kitchen Display Device',
    description: 'Creates a new kitchen display device. The device must belong to the authenticated user\'s merchant. Only portal administrators and merchant administrators can create kitchen display devices.',
  })
  @ApiCreatedResponse({
    description: 'Kitchen display device created successfully',
    type: OneKitchenDisplayDeviceResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or validation errors',
    type: ErrorResponse,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - You must be associated with a merchant to create kitchen display devices',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Merchant or kitchen station not found',
    type: ErrorResponse,
  })
  @ApiBody({
    type: CreateKitchenDisplayDeviceDto,
    description: 'Kitchen display device creation data',
    examples: {
      example1: {
        summary: 'Create kitchen display device',
        value: {
          stationId: 1,
          name: 'Kitchen Display 1',
          deviceIdentifier: 'DEV-001',
          ipAddress: '192.168.1.100',
          isOnline: false,
        },
      },
    },
  })
  async create(@Body() createKitchenDisplayDeviceDto: CreateKitchenDisplayDeviceDto, @Request() req: any) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.kitchenDisplayDeviceService.create(createKitchenDisplayDeviceDto, authenticatedUserMerchantId);
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
    summary: 'Get all Kitchen Display Devices',
    description: 'Retrieves a paginated list of kitchen display devices. Only returns devices that belong to the authenticated user\'s merchant. Only portal administrators and merchant administrators can access kitchen display devices.',
  })
  @ApiOkResponse({
    description: 'Kitchen display devices retrieved successfully',
    type: PaginatedKitchenDisplayDeviceResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - You must be associated with a merchant to access kitchen display devices',
    type: ErrorResponse,
  })
  @ApiQuery({
    name: 'stationId',
    required: false,
    type: Number,
    description: 'Filter by kitchen station ID',
  })
  @ApiQuery({
    name: 'name',
    required: false,
    type: String,
    description: 'Filter by device name (partial match)',
  })
  @ApiQuery({
    name: 'deviceIdentifier',
    required: false,
    type: String,
    description: 'Filter by device identifier',
  })
  @ApiQuery({
    name: 'ipAddress',
    required: false,
    type: String,
    description: 'Filter by IP address',
  })
  @ApiQuery({
    name: 'isOnline',
    required: false,
    type: Boolean,
    description: 'Filter by online status',
  })
  @ApiQuery({
    name: 'createdDate',
    required: false,
    type: String,
    description: 'Filter by creation date (YYYY-MM-DD format)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination (minimum 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (minimum 1, maximum 100)',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['id', 'stationId', 'name', 'deviceIdentifier', 'ipAddress', 'isOnline', 'lastSync', 'createdAt', 'updatedAt'],
    description: 'Field to sort by',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Sort order (ASC or DESC)',
  })
  async findAll(@Query() query: GetKitchenDisplayDeviceQueryDto, @Request() req: any) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.kitchenDisplayDeviceService.findAll(query, authenticatedUserMerchantId);
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
  @ApiOperation({
    summary: 'Get a single Kitchen Display Device by ID',
    description: 'Retrieves a single kitchen display device by its ID. The device must belong to the authenticated user\'s merchant. Only portal administrators and merchant administrators can access kitchen display devices.',
  })
  @ApiOkResponse({
    description: 'Kitchen display device retrieved successfully',
    type: OneKitchenDisplayDeviceResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - You must be associated with a merchant to access kitchen display devices',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Kitchen display device not found',
    type: ErrorResponse,
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Kitchen display device ID',
    example: 1,
  })
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.kitchenDisplayDeviceService.findOne(id, authenticatedUserMerchantId);
  }

  @Put(':id')
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Update a Kitchen Display Device',
    description: 'Updates an existing kitchen display device. The device must belong to the authenticated user\'s merchant. Only portal administrators and merchant administrators can update kitchen display devices.',
  })
  @ApiOkResponse({
    description: 'Kitchen display device updated successfully',
    type: OneKitchenDisplayDeviceResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or validation errors',
    type: ErrorResponse,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - You must be associated with a merchant to update kitchen display devices',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Kitchen display device or kitchen station not found',
    type: ErrorResponse,
  })
  @ApiConflictResponse({
    description: 'Conflict - Cannot update a deleted kitchen display device',
    type: ErrorResponse,
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Kitchen display device ID',
    example: 1,
  })
  @ApiBody({
    type: UpdateKitchenDisplayDeviceDto,
    description: 'Kitchen display device update data',
    examples: {
      example1: {
        summary: 'Update device status and IP address',
        value: {
          isOnline: true,
          ipAddress: '192.168.1.101',
          lastSync: '2024-01-15T08:30:00Z',
        },
      },
      example2: {
        summary: 'Update device name',
        value: {
          name: 'Kitchen Display 1 - Updated',
        },
      },
    },
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateKitchenDisplayDeviceDto: UpdateKitchenDisplayDeviceDto,
    @Request() req: any,
  ) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.kitchenDisplayDeviceService.update(id, updateKitchenDisplayDeviceDto, authenticatedUserMerchantId);
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
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a Kitchen Display Device',
    description: 'Performs a logical deletion of a kitchen display device. The device must belong to the authenticated user\'s merchant. Only portal administrators and merchant administrators can delete kitchen display devices.',
  })
  @ApiOkResponse({
    description: 'Kitchen display device deleted successfully',
    type: OneKitchenDisplayDeviceResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - You must be associated with a merchant to delete kitchen display devices',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Kitchen display device not found',
    type: ErrorResponse,
  })
  @ApiConflictResponse({
    description: 'Conflict - Kitchen display device is already deleted',
    type: ErrorResponse,
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Kitchen display device ID',
    example: 1,
  })
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.kitchenDisplayDeviceService.remove(id, authenticatedUserMerchantId);
  }
}
