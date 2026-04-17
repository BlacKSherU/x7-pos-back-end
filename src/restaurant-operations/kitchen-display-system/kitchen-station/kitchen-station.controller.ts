import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  ParseIntPipe,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { KitchenStationService } from './kitchen-station.service';
import { CreateKitchenStationDto } from './dto/create-kitchen-station.dto';
import { UpdateKitchenStationDto } from './dto/update-kitchen-station.dto';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiBody,
  ApiForbiddenResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { OneKitchenStationResponseDto } from './dto/kitchen-station-response.dto';
import { GetKitchenStationQueryDto } from './dto/get-kitchen-station-query.dto';
import { PaginatedKitchenStationResponseDto } from './dto/paginated-kitchen-station-response.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { KitchenStationStatus } from './constants/kitchen-station-status.enum';
import { KitchenStationType } from './constants/kitchen-station-type.enum';
import { KitchenDisplayMode } from './constants/kitchen-display-mode.enum';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';

@ApiTags('Kitchen Stations')
@ApiBearerAuth()
@Controller('kitchen-station')
@UseGuards(JwtAuthGuard, RolesGuard)
export class KitchenStationController {
  constructor(private readonly kitchenStationService: KitchenStationService) {}

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
    summary: 'Create a new Kitchen Station',
    description:
      "Creates a new kitchen station for the authenticated user's merchant. Only portal administrators and merchant administrators can create kitchen stations.",
  })
  @ApiCreatedResponse({
    description: 'Kitchen station created successfully',
    type: OneKitchenStationResponseDto,
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
    description:
      'Forbidden - You must be associated with a merchant to create kitchen stations',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Merchant not found',
    type: ErrorResponse,
  })
  @ApiBody({
    type: CreateKitchenStationDto,
    description: 'Kitchen station creation data',
    examples: {
      example1: {
        summary: 'Create hot station',
        value: {
          name: 'Hot Station 1',
          stationType: 'HOT',
          displayMode: 'AUTO',
          displayOrder: 1,
          printerName: 'Kitchen Printer 1',
        },
      },
      example2: {
        summary: 'Create cold station',
        value: {
          name: 'Cold Station 1',
          stationType: 'COLD',
          displayMode: 'MANUAL',
          displayOrder: 2,
        },
      },
    },
  })
  async create(
    @Body() dto: CreateKitchenStationDto,
    @Request() req: AuthenticatedUser,
  ): Promise<OneKitchenStationResponseDto> {
    const authenticatedUserMerchantId = req.merchant?.id;
    return this.kitchenStationService.create(dto, authenticatedUserMerchantId);
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
    summary: 'Get all Kitchen Stations with pagination and filters',
    description:
      "Retrieves a paginated list of kitchen stations for the authenticated user's merchant. Supports filtering by station type, display mode, active status, and creation date.",
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination (minimum 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (1-100)',
    example: 10,
  })
  @ApiQuery({
    name: 'stationType',
    required: false,
    enum: KitchenStationType,
    description: 'Filter by station type',
    example: KitchenStationType.HOT,
  })
  @ApiQuery({
    name: 'displayMode',
    required: false,
    enum: KitchenDisplayMode,
    description: 'Filter by display mode',
    example: KitchenDisplayMode.AUTO,
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filter by active status',
    example: true,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: KitchenStationStatus,
    description: 'Filter by status (active, deleted)',
    example: KitchenStationStatus.ACTIVE,
  })
  @ApiQuery({
    name: 'createdDate',
    required: false,
    type: String,
    description: 'Filter by creation date (YYYY-MM-DD format)',
    example: '2023-10-01',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['name', 'displayOrder', 'createdAt', 'updatedAt'],
    description: 'Field to sort by',
    example: 'displayOrder',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Sort order',
    example: 'ASC',
  })
  @ApiOkResponse({
    description: 'Paginated list of kitchen stations retrieved successfully',
    type: PaginatedKitchenStationResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - User must be associated with a merchant to view kitchen stations',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters',
    type: ErrorResponse,
  })
  async findAll(
    @Query() query: GetKitchenStationQueryDto,
    @Request() req: AuthenticatedUser,
  ): Promise<PaginatedKitchenStationResponseDto> {
    const authenticatedUserMerchantId = req.merchant?.id;
    return this.kitchenStationService.findAll(
      query,
      authenticatedUserMerchantId,
    );
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
    summary: 'Get a Kitchen Station by ID',
    description:
      'Retrieves a specific kitchen station by its ID. Users can only access kitchen stations from their own merchant.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Kitchen station ID' })
  @ApiOkResponse({
    description: 'Kitchen station found successfully',
    type: OneKitchenStationResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({
    description:
      'Forbidden - You can only view kitchen stations from your own merchant',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Kitchen station not found',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'Invalid kitchen station ID',
    type: ErrorResponse,
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedUser,
  ): Promise<OneKitchenStationResponseDto> {
    const authenticatedUserMerchantId = req.merchant?.id;
    return this.kitchenStationService.findOne(id, authenticatedUserMerchantId);
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
    summary: 'Update a Kitchen Station by ID',
    description:
      "Updates an existing kitchen station for the authenticated user's merchant. Only portal administrators and merchant administrators can update kitchen stations. All fields are optional.",
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Kitchen station ID to update',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Kitchen station updated successfully',
    type: OneKitchenStationResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - You can only update kitchen stations from your own merchant',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Kitchen station not found',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or ID',
    type: ErrorResponse,
  })
  @ApiBody({
    type: UpdateKitchenStationDto,
    description: 'Kitchen station update data (all fields optional)',
    examples: {
      example1: {
        summary: 'Update name and display order',
        value: {
          name: 'Hot Station 1 Updated',
          displayOrder: 2,
        },
      },
      example2: {
        summary: 'Update active status',
        value: {
          isActive: false,
        },
      },
    },
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateKitchenStationDto,
    @Request() req: AuthenticatedUser,
  ): Promise<OneKitchenStationResponseDto> {
    const authenticatedUserMerchantId = req.merchant?.id;
    return this.kitchenStationService.update(
      id,
      dto,
      authenticatedUserMerchantId,
    );
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
  @ApiOperation({
    summary: 'Soft delete a Kitchen Station by ID',
    description:
      'Performs a soft delete by changing the kitchen station status to "deleted". Only merchant administrators can delete kitchen stations from their own merchant.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Kitchen station ID to delete',
  })
  @ApiOkResponse({
    description: 'Kitchen station soft deleted successfully',
    type: OneKitchenStationResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({
    description:
      'Forbidden - You can only delete kitchen stations from your own merchant',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Kitchen station not found',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'Invalid kitchen station ID',
    type: ErrorResponse,
  })
  @ApiConflictResponse({
    description: 'Kitchen station is already deleted',
    type: ErrorResponse,
  })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedUser,
  ): Promise<OneKitchenStationResponseDto> {
    const authenticatedUserMerchantId = req.merchant?.id;
    return this.kitchenStationService.remove(id, authenticatedUserMerchantId);
  }
}
