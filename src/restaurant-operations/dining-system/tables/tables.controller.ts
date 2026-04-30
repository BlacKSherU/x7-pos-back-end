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
  ForbiddenException,
  Query,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { FeatureAccessGuard } from 'src/auth/guards/feature-access.guard';
import { RequireFeature } from 'src/auth/decorators/require-feature.decorator';
import { SUBSCRIPTION_FEATURE_IDS } from 'src/common/subscription/subscription-feature-ids';

import { TablesService } from './tables.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { OneTableResponseDto } from './dto/table-response.dto';
import { GetTablesQueryDto } from './dto/get-tables-query.dto';
import { PaginatedTablesResponseDto } from './dto/paginated-tables-response.dto';
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
import { AuthenticatedUser } from '../../../auth/interfaces/authenticated-user.interface';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';

@ApiTags('Tables')
@ApiBearerAuth()
@Controller('tables')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.TABLES)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
export class TablesController {
  constructor(private readonly tableService: TablesService) {}

  @Post()
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Create a new table',
    description:
      "Creates a new table for the authenticated user's merchant. Only merchant administrators can create tables. The table number must be unique within the merchant. Table capacity must be at least 1 person (no maximum limit).",
  })
  @ApiCreatedResponse({
    description: 'Table created successfully',
    type: OneTableResponseDto,
    schema: {
      example: {
        id: 1,
        number: 'A1',
        capacity: 4,
        status: 'available',
        location: 'Near window',
        merchant: {
          id: 1,
          name: 'Restaurant ABC',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or business rule violation',
    schema: {
      example: {
        statusCode: 400,
        message: 'Table capacity must be greater than 0',
        error: 'Bad Request',
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
  @ApiForbiddenResponse({
    description: 'Forbidden - You can only create tables for your own merchant',
    schema: {
      example: {
        statusCode: 403,
        message: 'You can only create tables for your own merchant',
        error: 'Forbidden',
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
  @ApiConflictResponse({
    description: 'Table number already exists for this merchant',
    schema: {
      example: {
        statusCode: 409,
        message: "Table number 'A1' already exists for merchant 1",
        error: 'Conflict',
      },
    },
  })
  @ApiBody({
    type: CreateTableDto,
    description: 'Table creation data',
    examples: {
      example1: {
        summary: 'Basic table',
        description: 'A simple table with basic information',
        value: {
          merchant_id: 1,
          number: 'A1',
          capacity: 4,
          status: 'available',
          location: 'Near window',
        },
      },
      example2: {
        summary: 'Large table',
        description: 'A large table for groups',
        value: {
          merchant_id: 1,
          number: 'B1',
          capacity: 8,
          status: 'available',
          location: 'Center area',
        },
      },
    },
  })
  async create(
    @Body() dto: CreateTableDto,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<OneTableResponseDto> {
    const authenticatedUser = req.user as AuthenticatedUser | undefined;
    const authenticatedUserMerchantId = authenticatedUser?.merchant?.id;

    // Validate that the user has a merchant_id
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'User must be associated with a merchant to create tables',
      );
    }

    return this.tableService.create(dto, authenticatedUserMerchantId);
  }

  @Get()
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Get all tables with pagination and filters',
    description:
      'Retrieves a paginated list of tables with optional filters. Users can only see tables from their own merchant. Supports filtering by status and capacity range.',
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
    name: 'status',
    required: false,
    type: String,
    description: 'Filter tables by status',
    example: 'available',
  })
  @ApiQuery({
    name: 'minCapacity',
    required: false,
    type: Number,
    description: 'Filter tables by minimum capacity',
    example: 4,
  })
  @ApiQuery({
    name: 'maxCapacity',
    required: false,
    type: Number,
    description: 'Filter tables by maximum capacity',
    example: 8,
  })
  @ApiOkResponse({
    description: 'Paginated list of tables retrieved successfully',
    type: PaginatedTablesResponseDto,
    schema: {
      example: {
        data: [
          {
            id: 1,
            number: 'A1',
            capacity: 4,
            status: 'available',
            location: 'Near window',
            merchant: {
              id: 1,
              name: 'Restaurant ABC',
            },
          },
          {
            id: 2,
            number: 'A2',
            capacity: 2,
            status: 'occupied',
            location: 'Corner',
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
  @ApiForbiddenResponse({
    description:
      'Forbidden - User must be associated with a merchant to view tables',
    schema: {
      example: {
        statusCode: 403,
        message: 'User must be associated with a merchant to view tables',
        error: 'Forbidden',
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
        invalidCapacityRange: {
          summary: 'Invalid capacity range',
          value: {
            statusCode: 400,
            message: 'Minimum capacity cannot be greater than maximum capacity',
            error: 'Bad Request',
          },
        },
      },
    },
  })
  async findAll(
    @Query() query: GetTablesQueryDto,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<PaginatedTablesResponseDto> {
    const authenticatedUser = req.user as AuthenticatedUser | undefined;
    const authenticatedUserMerchantId = authenticatedUser?.merchant?.id;

    // Validate that the user has a merchant_id
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'User must be associated with a merchant to view tables',
      );
    }

    return this.tableService.findAll(query, authenticatedUserMerchantId);
  }

  @Get(':id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Get a table by ID',
    description:
      'Retrieves a specific table by its ID. Users can only access tables from their own merchant. The response excludes creation and update dates but includes basic merchant information.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Table ID',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Table found successfully',
    type: OneTableResponseDto,
    schema: {
      example: {
        id: 1,
        number: 'A1',
        capacity: 4,
        status: 'available',
        location: 'Near window',
        merchant: {
          id: 1,
          name: 'Restaurant ABC',
        },
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
  @ApiForbiddenResponse({
    description: 'Forbidden - You can only view tables from your own merchant',
    schema: {
      example: {
        statusCode: 403,
        message: 'You can only view tables from your own merchant',
        error: 'Forbidden',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Table or merchant not found',
    schema: {
      examples: {
        tableNotFound: {
          summary: 'Table not found',
          value: {
            statusCode: 404,
            message: 'Table 999 not found',
            error: 'Not Found',
          },
        },
        merchantNotFound: {
          summary: 'Merchant not found',
          value: {
            statusCode: 404,
            message: 'Merchant with ID 999 not found',
            error: 'Not Found',
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid ID format or value',
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid table ID',
        error: 'Bad Request',
      },
    },
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<OneTableResponseDto> {
    const authenticatedUser = req.user as AuthenticatedUser | undefined;
    const authenticatedUserMerchantId = authenticatedUser?.merchant?.id;

    // Validate that the user has a merchant_id
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'User must be associated with a merchant to view tables',
      );
    }

    return this.tableService.findOne(id, authenticatedUserMerchantId);
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
    summary: 'Update a table by ID',
    description:
      "Updates an existing table for the authenticated user's merchant. Only merchant administrators can update tables. The merchant value cannot be modified. All fields are optional. If updating the table number, it must remain unique within the merchant. Table capacity must be at least 1 person (no maximum limit).",
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Table ID to update',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Table updated successfully',
    type: OneTableResponseDto,
    schema: {
      example: {
        id: 1,
        number: 'A1',
        capacity: 6,
        status: 'available',
        location: 'Near window',
        merchant: {
          id: 1,
          name: 'Restaurant ABC',
        },
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
  @ApiForbiddenResponse({
    description:
      'Forbidden - You can only update tables from your own merchant',
    schema: {
      example: {
        statusCode: 403,
        message: 'You can only update tables from your own merchant',
        error: 'Forbidden',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Table not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Table 999 not found',
        error: 'Not Found',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data, ID format, or business rule violation',
    schema: {
      examples: {
        invalidId: {
          summary: 'Invalid ID format',
          value: {
            statusCode: 400,
            message: 'Validation failed (numeric string is expected)',
            error: 'Bad Request',
          },
        },
        invalidCapacity: {
          summary: 'Invalid capacity',
          value: {
            statusCode: 400,
            message: 'Table capacity must be a positive integer',
            error: 'Bad Request',
          },
        },
        merchantModification: {
          summary: 'Merchant modification attempt',
          value: {
            statusCode: 400,
            message: 'Merchant value cannot be modified',
            error: 'Bad Request',
          },
        },
      },
    },
  })
  @ApiConflictResponse({
    description: 'Table number already exists for this merchant',
    schema: {
      example: {
        statusCode: 409,
        message: "Table number 'A1' already exists for your merchant",
        error: 'Conflict',
      },
    },
  })
  @ApiBody({
    type: UpdateTableDto,
    description: 'Table update data (all fields optional)',
    examples: {
      example1: {
        summary: 'Update capacity only',
        description: 'Update only the table capacity',
        value: {
          capacity: 6,
        },
      },
      example2: {
        summary: 'Update multiple fields',
        description: 'Update capacity, status and location',
        value: {
          capacity: 8,
          status: 'occupied',
          location: 'Center area',
        },
      },
      example3: {
        summary: 'Update table number',
        description: 'Change the table number (must be unique)',
        value: {
          number: 'A3',
        },
      },
    },
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTableDto,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<OneTableResponseDto> {
    const authenticatedUser = req.user as AuthenticatedUser | undefined;
    const authenticatedUserMerchantId = authenticatedUser?.merchant?.id;

    // Validate that the user has a merchant_id
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'User must be associated with a merchant to update tables',
      );
    }

    return this.tableService.update(id, dto, authenticatedUserMerchantId);
  }

  @Delete(':id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Soft delete a table by ID',
    description:
      'Performs a soft delete by changing the table status to "deleted". Only merchant administrators can delete tables from their own merchant. The table information is returned after deletion (excluding creation and update dates) along with basic merchant information.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Table ID to delete',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Table deleted successfully (soft delete)',
    type: OneTableResponseDto,
    schema: {
      example: {
        id: 1,
        number: 'A1',
        capacity: 4,
        status: 'deleted',
        location: 'Near window',
        merchant: {
          id: 1,
          name: 'Restaurant ABC',
        },
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
  @ApiForbiddenResponse({
    description: 'Forbidden - Only merchant administrators can delete tables',
    schema: {
      example: {
        statusCode: 403,
        message: 'You can only delete tables from your own merchant',
        error: 'Forbidden',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Table or merchant not found',
    schema: {
      examples: {
        tableNotFound: {
          summary: 'Table not found',
          value: {
            statusCode: 404,
            message: 'Table 999 not found',
            error: 'Not Found',
          },
        },
        merchantNotFound: {
          summary: 'Merchant not found',
          value: {
            statusCode: 404,
            message: 'Merchant with ID 999 not found',
            error: 'Not Found',
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid ID format or value',
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid table ID',
        error: 'Bad Request',
      },
    },
  })
  @ApiConflictResponse({
    description: 'Table is already deleted or has dependencies',
    schema: {
      examples: {
        alreadyDeleted: {
          summary: 'Table already deleted',
          value: {
            statusCode: 409,
            message: 'Table is already deleted',
            error: 'Conflict',
          },
        },
        hasDependencies: {
          summary: 'Table has dependencies',
          value: {
            statusCode: 409,
            message: 'Cannot delete table with active orders',
            error: 'Conflict',
          },
        },
      },
    },
  })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<OneTableResponseDto> {
    const authenticatedUser = req.user as AuthenticatedUser | undefined;
    const authenticatedUserMerchantId = authenticatedUser?.merchant?.id;

    // Validate that the user has a merchant_id
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'User must be associated with a merchant to delete tables',
      );
    }

    return this.tableService.remove(id, authenticatedUserMerchantId);
  }
}
