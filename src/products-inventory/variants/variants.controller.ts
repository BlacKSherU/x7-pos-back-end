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
import { VariantsService } from './variants.service';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { GetVariantsQueryDto } from './dto/get-variants-query.dto';
import { AllPaginatedVariants } from './dto/all-paginated-variants.dto';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
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
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { UserRole } from 'src/users/constants/role.enum';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scope } from 'src/users/constants/scope.enum';
import { Variant } from './entities/variant.entity';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';

@ApiExtraModels(ErrorResponse)
@ApiBearerAuth()
@Controller('variants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VariantsController {
  constructor(private readonly variantsService: VariantsService) {}

  @Post()
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Create a new Variant' })
  @ApiOkResponse({ description: 'Variant created successfully', type: Variant })
  @ApiResponse({
    status: 400,
    description: 'Bad Request',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: ['Variant must be longer than or equal to 2 characters'],
        error: 'Bad Request',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({ description: 'Variant already exists' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createVariantDto: CreateVariantDto,
  ) {
    const merchantId = user.merchant.id;
    return this.variantsService.create(merchantId, createVariantDto);
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
    summary: 'Get all variants with pagination and filters',
    description:
      'Retrieves a paginated list of variants with optional filters. Users can only see variants from their own merchant. Supports filtering by name.',
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
    name: 'name',
    required: false,
    type: String,
    description: 'Filter variants by name',
    example: 'Red Small',
  })
  @ApiOkResponse({
    description: 'Paginated list of variants retrieved successfully',
    type: AllPaginatedVariants,
    schema: {
      example: {
        data: [
          {
            id: 1,
            name: 'Red Small',
            price: 10.99,
            sku: 'SKU001',
            product: {
              id: 1,
              name: 'T-Shirt',
            },
          },
          {
            id: 2,
            name: 'Blue Large',
            price: 12.99,
            sku: 'SKU002',
            product: {
              id: 1,
              name: 'T-Shirt',
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
    @Query() query: GetVariantsQueryDto,
  ): Promise<AllPaginatedVariants> {
    const merchantId = user.merchant.id;
    return this.variantsService.findAll(query, merchantId);
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
  @ApiOperation({ summary: 'Get a Variant by ID' })
  @ApiOkResponse({ description: 'Variant found', type: Variant })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Variant not found' })
  @ApiResponse({
    status: 404,
    description: 'Variant not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Variant not found',
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
    return this.variantsService.findOne(id, merchantId);
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
  @ApiOperation({ summary: 'Update a Variant' })
  @ApiParam({ name: 'id', type: Number, description: 'Variant ID' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Variant not found' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiOkResponse({ description: 'Variant updated successfully', type: Variant })
  @ApiResponse({
    status: 404,
    description: 'Variant not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Variant not found',
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
    @Body() updateVariantDto: UpdateVariantDto,
  ) {
    const merchantId = user.merchant.id;
    return this.variantsService.update(id, merchantId, updateVariantDto);
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
  @ApiOperation({ summary: 'Delete a Variant' })
  @ApiParam({ name: 'id', type: Number, description: 'Variant ID' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Variant not found' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiOkResponse({ description: 'Variant deleted' })
  @ApiResponse({
    status: 404,
    description: 'Variant not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Variant not found',
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
    return this.variantsService.remove(id, merchantId);
  }
}
