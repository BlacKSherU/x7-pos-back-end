import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiUnauthorizedResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { MovementsService } from './movements.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { UpdateMovementDto } from './dto/update-movement.dto';
import { GetMovementsQueryDto } from './dto/get-movements-query.dto';
import { AllPaginatedMovements } from './dto/all-paginated-movements.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/constants/role.enum';
import { Scope } from 'src/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { Movement } from './entities/movement.entity';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { OneMovementResponse } from './dto/movement-response.dto';

@ApiExtraModels(ErrorResponse)
@ApiBearerAuth()
@ApiTags('Stock Movements')
@Controller('movements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MovementsController {
  constructor(private readonly movementsService: MovementsService) {}

  @Post()
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Create a new Stock Movement' })
  @ApiCreatedResponse({
    description: 'Stock Movement created successfully',
    type: Movement,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: ['stock movement quantity must be an integer number'],
        error: 'Bad Request',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({ description: 'Stock Movement already exists' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createMovementDto: CreateMovementDto,
  ): Promise<OneMovementResponse> {
    const merchantId = user.merchant.id;
    return this.movementsService.create(merchantId, createMovementDto);
  }

  @Get()
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Get all stock movements with pagination and filters',
    description:
      'Retrieves a paginated list of stock movements with optional filters. Users can only see movements from their own merchant. Supports filtering by item ID.',
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
    name: 'itemId',
    required: false,
    type: Number,
    description: 'Filter movements by item',
    example: 'Item 1',
  })
  @ApiOkResponse({
    description: 'Paginated list of movements retrieved successfully',
    type: AllPaginatedMovements,
    schema: {
      example: {
        data: [
          {
            id: 1,
            item: { id: 1, currentQty: 10 },
            quantity: 5,
            type: 'entry',
            reference: 'PO-001',
            createdAt: '2023-01-01T10:00:00Z',
          },
          {
            id: 2,
            item: { id: 2, currentQty: 20 },
            quantity: 2,
            type: 'exit',
            reference: 'SO-005',
            createdAt: '2023-01-02T11:00:00Z',
          },
        ],
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: false,
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Stock Movement not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Stock Movement with ID 999 not found',
        error: 'Not Found',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters or business rule violation',
    schema: {
      examples: {
        invalidPage: {
          summary: 'Invalid page number',
          value: {
            statusCode: 400,
            message: 'page must not be less than 1',
            error: 'Bad Request',
          },
        },
        invalidLimit: {
          summary: 'Invalid limit',
          value: {
            statusCode: 400,
            message: 'limit must not be greater than 100',
            error: 'Bad Request',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 500,
        message: 'Internal server error',
        error: 'Internal Server Error',
      },
    },
  })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetMovementsQueryDto,
  ): Promise<AllPaginatedMovements> {
    const merchantId = user.merchant.id;
    return this.movementsService.findAll(query, merchantId);
  }

  @Get(':id')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Get a Stock Movement by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Stock Movement ID' })
  @ApiOkResponse({ description: 'Stock Movement found', type: Movement })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Stock Movement not found' })
  @ApiResponse({
    status: 404,
    description: 'Stock Movement not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Stock Movement not found',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid ID',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Validation failed (numeric string is expected)',
        error: 'Bad Request',
      },
    },
  })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OneMovementResponse> {
    const merchantId = user.merchant.id;
    return this.movementsService.findOne(id, merchantId);
  }

  @Patch(':id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Update a Stock Movement' })
  @ApiParam({ name: 'id', type: Number, description: 'Stock Movement ID' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Stock Movement not found' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiBody({ type: UpdateMovementDto })
  @ApiOkResponse({
    description: 'Stock Movement updated successfully',
    type: Movement,
  })
  @ApiResponse({
    status: 404,
    description: 'Stock Movement not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Stock Movement not found',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'stock movement quantity must be an integer number',
        error: 'Bad Request',
      },
    },
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMovementDto: UpdateMovementDto,
  ): Promise<OneMovementResponse> {
    const merchantId = user.merchant.id;
    return this.movementsService.update(id, merchantId, updateMovementDto);
  }

  @Delete(':id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Delete a Stock Movement' })
  @ApiParam({ name: 'id', type: Number, description: 'Stock Movement ID' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Stock Movement not found' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiOkResponse({ description: 'Stock Movement deleted' })
  @ApiResponse({
    status: 404,
    description: 'Stock Movement not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Stock Movement not found',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid ID',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'Validation failed (numeric string is expected)',
        error: 'Bad Request',
      },
    },
  })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OneMovementResponse> {
    const merchantId = user.merchant.id;
    return this.movementsService.remove(id, merchantId);
  }
}
