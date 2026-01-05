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
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { GetItemsQueryDto } from './dto/get-items-query.dto';
import { AllPaginatedItems } from './dto/all-paginated-items.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/constants/role.enum';
import { Scope } from 'src/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { Item } from './entities/item.entity';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { OneItemResponse } from './dto/item-response.dto';

@ApiExtraModels(ErrorResponse)
@ApiBearerAuth()
@ApiTags('Stock Items')
@Controller('items')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Post()
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Create a new Stock Item' })
  @ApiCreatedResponse({
    description: 'Stock Item created successfully',
    type: Item,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: [
          'stock item name must be longer than or equal to 2 characters',
        ],
        error: 'Bad Request',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({ description: 'Stock Item already exists' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createItemDto: CreateItemDto,
  ): Promise<OneItemResponse> {
    const merchantId = user.merchant.id;
    return this.itemsService.create(merchantId, createItemDto);
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
    summary: 'Get all stock items with pagination and filters',
    description:
      'Retrieves a paginated list of stock items with optional filters. Users can only see stock items from their own merchant. Supports filtering by product name.',
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
    name: 'productName',
    required: false,
    type: String,
    description: 'Filter items by product name',
    example: 'Laptop Pro',
  })
  @ApiQuery({
    name: 'variantName',
    required: false,
    type: String,
    description: 'Filter items by variant name',
    example: 'Laptop Pro 1',
  })
  @ApiOkResponse({
    description: 'Paginated list of stock items retrieved successfully',
    type: AllPaginatedItems,
    schema: {
      example: {
        data: [
          {
            id: 1,
            currentQty: 10,
            product: { id: 1, name: 'Laptop Pro' },
            variant: { id: 1, name: 'Silver 16GB' },
            location: { id: 1, name: 'Warehouse A' },
          },
          {
            id: 2,
            currentQty: 5,
            product: { id: 2, name: 'Smartphone X' },
            variant: { id: 2, name: 'Black 128GB' },
            location: { id: 1, name: 'Warehouse A' },
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
    description: 'Stock Item with ID 999 not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Stock Item with ID 999 not found',
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
    @Query() query: GetItemsQueryDto,
  ): Promise<AllPaginatedItems> {
    const merchantId = user.merchant.id;
    return this.itemsService.findAll(query, merchantId);
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
  @ApiOperation({ summary: 'Get a Stock Item by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Stock Item ID' })
  @ApiOkResponse({ description: 'Stock Item found', type: Item })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Stock Item not found' })
  @ApiResponse({
    status: 404,
    description: 'Stock Item not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Stock Item not found',
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
  ): Promise<OneItemResponse> {
    const merchantId = user.merchant.id;
    return this.itemsService.findOne(id, merchantId);
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
  @ApiOperation({ summary: 'Update a Stock Item' })
  @ApiParam({ name: 'id', type: Number, description: 'Stock Item ID' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Stock Item not found' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiBody({ type: UpdateItemDto })
  @ApiOkResponse({
    description: 'Stock Item updated successfully',
    type: Item,
  })
  @ApiResponse({
    status: 404,
    description: 'Stock Item not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Stock Item not found',
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
        message: 'stock item name must be longer than or equal to 2 characters',
        error: 'Bad Request',
      },
    },
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateItemDto: UpdateItemDto,
  ): Promise<OneItemResponse> {
    const merchantId = user.merchant.id;
    return this.itemsService.update(id, merchantId, updateItemDto);
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
  @ApiOperation({ summary: 'Delete a Stock Item' })
  @ApiParam({ name: 'id', type: Number, description: 'Stock Item ID' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Stock Item not found' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiOkResponse({ description: 'Stock Item deleted' })
  @ApiResponse({
    status: 404,
    description: 'Stock Item not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Stock Item not found',
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
  ): Promise<OneItemResponse> {
    const merchantId = user.merchant.id;
    return this.itemsService.remove(id, merchantId);
  }
}
