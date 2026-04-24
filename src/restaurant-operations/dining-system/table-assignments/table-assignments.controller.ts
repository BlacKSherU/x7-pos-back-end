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
  Request,
} from '@nestjs/common';
import { FeatureAccessGuard } from 'src/auth/guards/feature-access.guard';
import { RequireFeature } from 'src/auth/decorators/require-feature.decorator';
import { SUBSCRIPTION_FEATURE_IDS } from 'src/common/subscription/subscription-feature-ids';

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
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { TableAssignmentsService } from './table-assignments.service';
import { CreateTableAssignmentDto } from './dto/create-table-assignment.dto';
import { UpdateTableAssignmentDto } from './dto/update-table-assignment.dto';
import { GetTableAssignmentsQueryDto } from './dto/get-table-assignments-query.dto';
import { OneTableAssignmentResponseDto } from './dto/table-assignment-response.dto';
import { PaginatedTableAssignmentsResponseDto } from './dto/paginated-table-assignments-response.dto';

@ApiTags('Table Assignments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
@Controller('table-assignments')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.TABLE_ASSIGNMENTS)
export class TableAssignmentsController {
  constructor(
    private readonly tableAssignmentsService: TableAssignmentsService,
  ) {}

  @Post()
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({
    summary: 'Create a new table assignment',
    description:
      'Creates a new table assignment. Only merchant administrators can create table assignments. The shift, table, and collaborator must exist and belong to the same merchant as the authenticated user. The response includes basic information about the shift, table, and collaborator.',
  })
  @ApiBody({
    type: CreateTableAssignmentDto,
    examples: {
      basic: {
        summary: 'Basic table assignment',
        value: {
          shiftId: 1,
          tableId: 5,
          collaboratorId: 3,
        },
      },
      withRelease: {
        summary: 'Table assignment with release time',
        value: {
          shiftId: 1,
          tableId: 5,
          collaboratorId: 3,
          releasedAt: '2024-01-15T16:00:00Z',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Table assignment created successfully',
    type: OneTableAssignmentResponseDto,
    example: {
      success: true,
      message: 'Table assignment created successfully',
      data: {
        id: 1,
        shiftId: 1,
        tableId: 5,
        collaboratorId: 3,
        assignedAt: '2024-01-15T08:00:00Z',
        releasedAt: '2024-01-15T16:00:00Z',
        shift: {
          id: 1,
          merchantId: 1,
          merchantName: 'Restaurant Name',
        },
        table: {
          id: 5,
          name: 'Table 5',
          capacity: 4,
        },
        collaborator: {
          id: 3,
          name: 'John Doe',
          role: 'WAITER',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
    schema: {
      examples: {
        invalidDate: {
          summary: 'Invalid date format',
          value: {
            statusCode: 400,
            message: 'Invalid date format. Please provide a valid date string',
            error: 'Bad Request',
          },
        },
        invalidTimeOrder: {
          summary: 'Invalid time order',
          value: {
            statusCode: 400,
            message: 'Release time must be after assignment time',
            error: 'Bad Request',
          },
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
    description: 'Forbidden - Insufficient permissions or merchant mismatch',
    schema: {
      examples: {
        insufficientPermissions: {
          summary: 'Insufficient permissions',
          value: {
            statusCode: 403,
            message:
              'User must be associated with a merchant to create table assignments',
            error: 'Forbidden',
          },
        },
        merchantMismatch: {
          summary: 'Merchant mismatch',
          value: {
            statusCode: 403,
            message:
              'Cannot create table assignments for shifts from different merchants',
            error: 'Forbidden',
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Resource not found',
    schema: {
      examples: {
        shiftNotFound: {
          summary: 'Shift not found',
          value: {
            statusCode: 404,
            message: 'Shift not found',
            error: 'Not Found',
          },
        },
        tableNotFound: {
          summary: 'Table not found',
          value: {
            statusCode: 404,
            message: 'Table not found',
            error: 'Not Found',
          },
        },
        collaboratorNotFound: {
          summary: 'Collaborator not found',
          value: {
            statusCode: 404,
            message: 'Collaborator not found',
            error: 'Not Found',
          },
        },
      },
    },
  })
  @ApiConflictResponse({
    description: 'Conflict - Business rule violation',
    schema: {
      example: {
        statusCode: 409,
        message: 'Table is already assigned to another collaborator',
        error: 'Conflict',
      },
    },
  })
  async create(
    @Body() createTableAssignmentDto: CreateTableAssignmentDto,
    @Request() req: AuthenticatedUser,
  ): Promise<OneTableAssignmentResponseDto> {
    const authenticatedUserMerchantId = req.merchant?.id;
    return this.tableAssignmentsService.create(
      createTableAssignmentDto,
      authenticatedUserMerchantId,
    );
  }

  @Get()
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({
    summary: 'Get all table assignments',
    description:
      "Retrieves all table assignments for the authenticated user's merchant with optional filtering and pagination. Supports filtering by shift ID, table ID, collaborator ID, and assigned date. Results are paginated and can be sorted by various fields.",
  })
  @ApiQuery({
    name: 'shiftId',
    required: false,
    description: 'Filter by shift ID',
  })
  @ApiQuery({
    name: 'tableId',
    required: false,
    description: 'Filter by table ID',
  })
  @ApiQuery({
    name: 'collaboratorId',
    required: false,
    description: 'Filter by collaborator ID',
  })
  @ApiQuery({
    name: 'assignedDate',
    required: false,
    description: 'Filter by assigned date (YYYY-MM-DD format)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number for pagination (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page (default: 10, max: 100)',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Field to sort by (default: assignedAt)',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order: ASC or DESC (default: DESC)',
  })
  @ApiOkResponse({
    description: 'Table assignments retrieved successfully',
    type: PaginatedTableAssignmentsResponseDto,
    example: {
      success: true,
      message: 'Table assignments retrieved successfully',
      data: [
        {
          id: 1,
          shiftId: 1,
          tableId: 5,
          collaboratorId: 3,
          assignedAt: '2024-01-15T08:00:00Z',
          releasedAt: '2024-01-15T16:00:00Z',
          shift: {
            id: 1,
            merchantId: 1,
            merchantName: 'Restaurant Name',
          },
          table: {
            id: 5,
            name: 'Table 5',
            capacity: 4,
          },
          collaborator: {
            id: 3,
            name: 'John Doe',
            role: 'WAITER',
          },
        },
      ],
      paginationMeta: {
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: false,
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters',
    schema: {
      examples: {
        invalidDate: {
          summary: 'Invalid date format',
          value: {
            statusCode: 400,
            message: 'Invalid date format. Please provide a valid date string',
            error: 'Bad Request',
          },
        },
        invalidPagination: {
          summary: 'Invalid pagination parameters',
          value: {
            statusCode: 400,
            message: 'Page must be a positive number',
            error: 'Bad Request',
          },
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
    description: 'Forbidden - Insufficient permissions',
    schema: {
      example: {
        statusCode: 403,
        message:
          'User must be associated with a merchant to view table assignments',
        error: 'Forbidden',
      },
    },
  })
  async findAll(
    @Query() query: GetTableAssignmentsQueryDto,
    @Request() req: AuthenticatedUser,
  ): Promise<PaginatedTableAssignmentsResponseDto> {
    const authenticatedUserMerchantId = req.merchant?.id;
    return this.tableAssignmentsService.findAll(
      query,
      authenticatedUserMerchantId,
    );
  }

  @Get(':id')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({
    summary: 'Get a table assignment by ID',
    description:
      'Retrieves a specific table assignment by its ID. The assignment must belong to the same merchant as the authenticated user. The response includes basic information about the shift, table, and collaborator.',
  })
  @ApiParam({ name: 'id', description: 'Table assignment ID', type: 'integer' })
  @ApiOkResponse({
    description: 'Table assignment retrieved successfully',
    type: OneTableAssignmentResponseDto,
    example: {
      success: true,
      message: 'Table assignment retrieved successfully',
      data: {
        id: 1,
        shiftId: 1,
        tableId: 5,
        collaboratorId: 3,
        assignedAt: '2024-01-15T08:00:00Z',
        releasedAt: '2024-01-15T16:00:00Z',
        shift: {
          id: 1,
          merchantId: 1,
          merchantName: 'Restaurant Name',
        },
        table: {
          id: 5,
          name: 'Table 5',
          capacity: 4,
        },
        collaborator: {
          id: 3,
          name: 'John Doe',
          role: 'WAITER',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid ID parameter',
    schema: {
      example: {
        statusCode: 400,
        message: 'Validation failed (numeric string is expected)',
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
    description: 'Forbidden - Insufficient permissions or merchant mismatch',
    schema: {
      examples: {
        insufficientPermissions: {
          summary: 'Insufficient permissions',
          value: {
            statusCode: 403,
            message:
              'User must be associated with a merchant to view table assignments',
            error: 'Forbidden',
          },
        },
        merchantMismatch: {
          summary: 'Merchant mismatch',
          value: {
            statusCode: 403,
            message: 'Cannot access table assignments from different merchants',
            error: 'Forbidden',
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Table assignment not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Table assignment not found',
        error: 'Not Found',
      },
    },
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedUser,
  ): Promise<OneTableAssignmentResponseDto> {
    const authenticatedUserMerchantId = req.merchant?.id;
    return this.tableAssignmentsService.findOne(
      id,
      authenticatedUserMerchantId,
    );
  }

  @Patch(':id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({
    summary: 'Update a table assignment',
    description:
      'Updates a table assignment. Only merchant administrators can update table assignments. The assignment must belong to the same merchant as the authenticated user. Only the release time can be updated.',
  })
  @ApiParam({ name: 'id', description: 'Table assignment ID', type: 'integer' })
  @ApiBody({
    type: UpdateTableAssignmentDto,
    examples: {
      releaseTable: {
        summary: 'Release a table',
        value: {
          releasedAt: '2024-01-15T16:00:00Z',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Table assignment updated successfully',
    type: OneTableAssignmentResponseDto,
    example: {
      success: true,
      message: 'Table assignment updated successfully',
      data: {
        id: 1,
        shiftId: 1,
        tableId: 5,
        collaboratorId: 3,
        assignedAt: '2024-01-15T08:00:00Z',
        releasedAt: '2024-01-15T16:00:00Z',
        shift: {
          id: 1,
          merchantId: 1,
          merchantName: 'Restaurant Name',
        },
        table: {
          id: 5,
          name: 'Table 5',
          capacity: 4,
        },
        collaborator: {
          id: 3,
          name: 'John Doe',
          role: 'WAITER',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
    schema: {
      examples: {
        invalidDate: {
          summary: 'Invalid date format',
          value: {
            statusCode: 400,
            message: 'Invalid date format. Please provide a valid date string',
            error: 'Bad Request',
          },
        },
        invalidTimeOrder: {
          summary: 'Invalid time order',
          value: {
            statusCode: 400,
            message: 'Release time must be after assignment time',
            error: 'Bad Request',
          },
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
    description: 'Forbidden - Insufficient permissions or merchant mismatch',
    schema: {
      examples: {
        insufficientPermissions: {
          summary: 'Insufficient permissions',
          value: {
            statusCode: 403,
            message:
              'User must be associated with a merchant to update table assignments',
            error: 'Forbidden',
          },
        },
        merchantMismatch: {
          summary: 'Merchant mismatch',
          value: {
            statusCode: 403,
            message: 'Cannot update table assignments from different merchants',
            error: 'Forbidden',
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Table assignment not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Table assignment not found',
        error: 'Not Found',
      },
    },
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTableAssignmentDto: UpdateTableAssignmentDto,
    @Request() req: AuthenticatedUser,
  ): Promise<OneTableAssignmentResponseDto> {
    const authenticatedUserMerchantId = req.merchant?.id;
    return this.tableAssignmentsService.update(
      id,
      updateTableAssignmentDto,
      authenticatedUserMerchantId,
    );
  }

  @Delete(':id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({
    summary: 'Delete a table assignment',
    description:
      'Deletes a table assignment. Only merchant administrators can delete table assignments. The assignment must belong to the same merchant as the authenticated user.',
  })
  @ApiParam({ name: 'id', description: 'Table assignment ID', type: 'integer' })
  @ApiOkResponse({
    description: 'Table assignment deleted successfully',
    type: OneTableAssignmentResponseDto,
    example: {
      success: true,
      message: 'Table assignment deleted successfully',
      data: {
        id: 1,
        shiftId: 1,
        tableId: 5,
        collaboratorId: 3,
        assignedAt: '2024-01-15T08:00:00Z',
        releasedAt: '2024-01-15T16:00:00Z',
        shift: {
          id: 1,
          merchantId: 1,
          merchantName: 'Restaurant Name',
        },
        table: {
          id: 5,
          name: 'Table 5',
          capacity: 4,
        },
        collaborator: {
          id: 3,
          name: 'John Doe',
          role: 'WAITER',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid ID parameter',
    schema: {
      example: {
        statusCode: 400,
        message: 'Validation failed (numeric string is expected)',
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
    description: 'Forbidden - Insufficient permissions or merchant mismatch',
    schema: {
      examples: {
        insufficientPermissions: {
          summary: 'Insufficient permissions',
          value: {
            statusCode: 403,
            message:
              'User must be associated with a merchant to delete table assignments',
            error: 'Forbidden',
          },
        },
        merchantMismatch: {
          summary: 'Merchant mismatch',
          value: {
            statusCode: 403,
            message: 'Cannot delete table assignments from different merchants',
            error: 'Forbidden',
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Table assignment not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Table assignment not found',
        error: 'Not Found',
      },
    },
  })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedUser,
  ): Promise<OneTableAssignmentResponseDto> {
    const authenticatedUserMerchantId = req.merchant?.id;
    return this.tableAssignmentsService.remove(id, authenticatedUserMerchantId);
  }
}
