import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { GetProductsQueryDto } from './dto/get-products-query.dto';
import { AllPaginatedProducts } from './dto/all-paginated-purchase-orders.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
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
} from '@nestjs/swagger';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { Product } from './entities/product.entity';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scope } from 'src/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { UserRole } from 'src/users/constants/role.enum';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';

@ApiExtraModels(ErrorResponse)
@ApiBearerAuth()
@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Create a new Product' })
  @ApiCreatedResponse({
    description: 'Product created successfully',
    type: Product,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: ['Product must be longer than or equal to 2 characters'],
        error: 'Bad Request',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({ description: 'Product already exists' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createProductDto: CreateProductDto,
  ) {
    const merchantId = user.merchant.id;
    return this.productsService.create(merchantId, createProductDto);
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
    summary: 'Get all products with pagination and filters',
    description:
      'Retrieves a paginated list of products with optional filters. Users can only see products from their own merchant. Supports filtering by name and category ID.',
  })
  @ApiQuery({
    name: 'categoryName',
    required: false,
    type: String,
    description: 'Filter products by category name',
    example: 'Beverages',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (1-100)',
    example: 10,
  })
  @ApiQuery({
    name: 'name',
    required: false,
    type: String,
    description: 'Filter products by name',
    example: 'Coffee',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    type: String,
    description: 'Filter products by category',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Paginated list of products retrieved successfully',
    type: AllPaginatedProducts,
    schema: {
      example: {
        data: [
          {
            id: 1,
            name: 'Espresso',
            description: 'Strong black coffee',
            price: 2.5,
            category: {
              id: 1,
              name: 'Beverages',
            },
            merchant: {
              id: 1,
              name: 'Restaurant ABC',
            },
          },
          {
            id: 2,
            name: 'Latte',
            description: 'Coffee with steamed milk',
            price: 3.0,
            category: {
              id: 1,
              name: 'Beverages',
            },
            merchant: {
              id: 1,
              name: 'Restaurant ABC',
            },
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
    description: 'Merchant not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Merchant with ID 999 not found',
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
    @Query() query: GetProductsQueryDto,
  ): Promise<AllPaginatedProducts> {
    const merchantId = user.merchant.id;
    return this.productsService.findAll(query, merchantId);
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
  @ApiOperation({ summary: 'Get a Product by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Product ID' })
  @ApiOkResponse({ description: 'Product found', type: Product })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Product not found',
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
  ) {
    const merchantId = user.merchant.id;
    return this.productsService.findOne(id, merchantId);
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
  @ApiOperation({ summary: 'Update a Product' })
  @ApiParam({ name: 'id', type: Number, description: 'Product ID' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiBody({ type: UpdateProductDto })
  @ApiOkResponse({
    description: 'Product updated successfully',
    type: Product,
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Product not found',
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
        message: 'name must be longer than or equal to 2 characters',
        error: 'Bad Request',
      },
    },
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    const merchantId = user.merchant.id;
    return this.productsService.update(id, merchantId, updateProductDto);
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
  @ApiOperation({ summary: 'Delete a Product' })
  @ApiParam({ name: 'id', type: Number, description: 'Product ID' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiOkResponse({ description: 'Product deleted' })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Product not found',
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
  ) {
    const merchantId = user.merchant.id;
    return this.productsService.remove(id, merchantId);
  }
}
